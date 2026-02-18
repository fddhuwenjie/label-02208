const express = require('express');
const { query, queryOne } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取仪表盘核心指标
router.get('/indicators', authenticateToken, (req, res) => {
  try {
    const totalResult = queryOne('SELECT COUNT(*) as count FROM equipment');
    const total = totalResult ? totalResult.count : 0;
    
    const activeResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '正常使用'");
    const active = activeResult ? activeResult.count : 0;
    
    const pendingMaintenanceResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '待维护'");
    const pendingMaintenance = pendingMaintenanceResult ? pendingMaintenanceResult.count : 0;
    
    const faultResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '故障停机'");
    const fault = faultResult ? faultResult.count : 0;
    
    // 高风险设备（超期未检或故障）
    const highRiskResult = queryOne(`
      SELECT COUNT(*) as count FROM equipment 
      WHERE status IN ('故障停机', '待报废') 
      OR (julianday('now') - julianday(purchase_date)) / 365 > service_years
    `);
    const highRisk = highRiskResult ? highRiskResult.count : 0;

    // 本月新增采购
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyPurchaseResult = queryOne(`
      SELECT COUNT(*) as count FROM purchase_requests 
      WHERE strftime('%Y-%m', created_at) = ?
    `, [currentMonth]);
    const monthlyPurchase = monthlyPurchaseResult ? monthlyPurchaseResult.count : 0;

    // 上月数据用于计算环比
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
    const lastMonthPurchaseResult = queryOne(`
      SELECT COUNT(*) as count FROM purchase_requests 
      WHERE strftime('%Y-%m', created_at) = ?
    `, [lastMonth]);
    const lastMonthPurchase = lastMonthPurchaseResult ? lastMonthPurchaseResult.count : 0;

    res.json({
      total,
      active,
      pendingMaintenance,
      fault,
      highRisk,
      monthlyPurchase,
      purchaseGrowth: lastMonthPurchase > 0 
        ? Math.round((monthlyPurchase - lastMonthPurchase) / lastMonthPurchase * 100) 
        : 0
    });
  } catch (error) {
    console.error('Get dashboard indicators error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取设备状态分布
router.get('/status-distribution', authenticateToken, (req, res) => {
  try {
    const distribution = query(`
      SELECT status, COUNT(*) as count 
      FROM equipment 
      GROUP BY status
    `);
    res.json(distribution);
  } catch (error) {
    console.error('Get status distribution error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取设备类型和科室分布
router.get('/type-department', authenticateToken, (req, res) => {
  try {
    const byType = query(`
      SELECT type, department, COUNT(*) as count 
      FROM equipment 
      WHERE type IS NOT NULL AND department IS NOT NULL
      GROUP BY type, department
    `);

    // 转换为图表所需格式
    const types = [...new Set(byType.map(item => item.type))];
    const departments = [...new Set(byType.map(item => item.department))];
    
    const series = departments.map(dept => ({
      name: dept,
      data: types.map(type => {
        const item = byType.find(b => b.type === type && b.department === dept);
        return item ? item.count : 0;
      })
    }));

    res.json({ types, departments, series, raw: byType });
  } catch (error) {
    console.error('Get type department distribution error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取维护进度
router.get('/maintenance-progress', authenticateToken, (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = new Date().getFullYear().toString();

    // 本月维护完成率
    const monthTotalResult = queryOne(`
      SELECT COUNT(*) as count FROM maintenance_records 
      WHERE strftime('%Y-%m', scheduled_date) = ?
    `, [currentMonth]);
    const monthTotal = monthTotalResult ? monthTotalResult.count : 0;
    
    const monthCompletedResult = queryOne(`
      SELECT COUNT(*) as count FROM maintenance_records 
      WHERE strftime('%Y-%m', scheduled_date) = ? AND status = '已完成'
    `, [currentMonth]);
    const monthCompleted = monthCompletedResult ? monthCompletedResult.count : 0;

    // 年度校准完成率
    const yearCalibrationTotalResult = queryOne(`
      SELECT COUNT(*) as count FROM maintenance_records 
      WHERE strftime('%Y', scheduled_date) = ? AND type = '校准'
    `, [currentYear]);
    const yearCalibrationTotal = yearCalibrationTotalResult ? yearCalibrationTotalResult.count : 0;
    
    const yearCalibrationCompletedResult = queryOne(`
      SELECT COUNT(*) as count FROM maintenance_records 
      WHERE strftime('%Y', scheduled_date) = ? AND type = '校准' AND status = '已完成'
    `, [currentYear]);
    const yearCalibrationCompleted = yearCalibrationCompletedResult ? yearCalibrationCompletedResult.count : 0;

    // 未完成项列表
    const pendingItems = query(`
      SELECT id, equipment_name, type, scheduled_date, responsible_person
      FROM maintenance_records 
      WHERE status != '已完成'
      ORDER BY scheduled_date
      LIMIT 10
    `);

    res.json({
      monthRate: monthTotal > 0 ? Math.round(monthCompleted / monthTotal * 100) : 0,
      monthTotal,
      monthCompleted,
      yearCalibrationRate: yearCalibrationTotal > 0 ? Math.round(yearCalibrationCompleted / yearCalibrationTotal * 100) : 0,
      yearCalibrationTotal,
      yearCalibrationCompleted,
      pendingItems
    });
  } catch (error) {
    console.error('Get maintenance progress error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取待办提醒
router.get('/todos', authenticateToken, (req, res) => {
  try {
    // 待审核采购申请
    const pendingPurchases = query(`
      SELECT id, request_no as code, equipment_name as name, '采购审批' as type, 
        created_at as deadline, department
      FROM purchase_requests 
      WHERE status = '待审批'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // 待处理故障报修
    const pendingFaults = query(`
      SELECT id, report_no as code, equipment_name as name, '故障报修' as type, 
        created_at as deadline, fault_type as description
      FROM fault_reports 
      WHERE status IN ('待派单', '维修中')
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // 即将到期校准设备
    const pendingCalibrations = query(`
      SELECT id, equipment_name as name, '设备校准' as type, 
        scheduled_date as deadline, responsible_person
      FROM maintenance_records 
      WHERE type = '校准' AND status != '已完成'
        AND scheduled_date <= date('now', '+7 days')
      ORDER BY scheduled_date
      LIMIT 5
    `);

    res.json({
      purchases: pendingPurchases,
      faults: pendingFaults,
      calibrations: pendingCalibrations
    });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 台账健康度数据
router.get('/ledger-health', authenticateToken, (req, res) => {
  try {
    // 近6个月台账完整率（模拟数据，实际应检查必填字段完整性）
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      months.push({
        month,
        rate: Math.floor(Math.random() * 5) + 95 // 95-100%
      });
    }

    // 设备使用年限分布
    const byYear = query(`
      SELECT 
        CASE 
          WHEN (julianday('now') - julianday(purchase_date)) / 365 <= 3 THEN '≤3年'
          WHEN (julianday('now') - julianday(purchase_date)) / 365 <= 5 THEN '3-5年'
          ELSE '>5年'
        END as year_range,
        COUNT(*) as count
      FROM equipment
      WHERE purchase_date IS NOT NULL
      GROUP BY year_range
    `);

    res.json({ completenessHistory: months, byYear });
  } catch (error) {
    console.error('Get ledger health error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
