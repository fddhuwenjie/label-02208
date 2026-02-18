const express = require('express');
const { query, queryOne } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 全周期数据总览
router.get('/lifecycle', authenticateToken, (req, res) => {
  try {
    // 设备生命周期漏斗
    const purchasedResult = queryOne('SELECT COUNT(*) as count FROM purchase_requests');
    const purchased = purchasedResult ? purchasedResult.count : 0;
    
    const storedResult = queryOne("SELECT COUNT(*) as count FROM purchase_requests WHERE status = '已入库'");
    const stored = storedResult ? storedResult.count : 0;
    
    const inUseResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '正常使用'");
    const inUse = inUseResult ? inUseResult.count : 0;
    
    const maintainedResult = queryOne('SELECT COUNT(DISTINCT equipment_id) as count FROM maintenance_records');
    const maintained = maintainedResult ? maintainedResult.count : 0;
    
    const scrappedResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '已报废'");
    const scrapped = scrappedResult ? scrappedResult.count : 0;

    // 科室热力图数据
    const departmentHeatmap = query(`
      SELECT 
        e.department,
        COUNT(*) as equipment_count,
        0 as fault_count,
        0 as maintenance_count
      FROM equipment e
      WHERE e.department IS NOT NULL
      GROUP BY e.department
    `);

    // 核心运营指标
    const totalEquipmentResult = queryOne('SELECT COUNT(*) as count FROM equipment');
    const totalEquipment = totalEquipmentResult ? totalEquipmentResult.count : 0;
    
    const activeEquipmentResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '正常使用'");
    const activeEquipment = activeEquipmentResult ? activeEquipmentResult.count : 0;
    const utilizationRate = totalEquipment > 0 ? Math.round(activeEquipment / totalEquipment * 100) : 0;

    const totalMaintenanceCostResult = queryOne('SELECT SUM(cost) as total FROM maintenance_records');
    const totalMaintenanceCost = totalMaintenanceCostResult ? (totalMaintenanceCostResult.total || 0) : 0;
    
    const totalFaultCostResult = queryOne('SELECT SUM(cost) as total FROM fault_reports');
    const totalFaultCost = totalFaultCostResult ? (totalFaultCostResult.total || 0) : 0;
    
    const totalEquipmentValueResult = queryOne('SELECT SUM(price) as total FROM equipment');
    const totalEquipmentValue = totalEquipmentValueResult ? (totalEquipmentValueResult.total || 0) : 0;
    
    const maintenanceCostRate = totalEquipmentValue > 0 
      ? ((totalMaintenanceCost + totalFaultCost) / totalEquipmentValue * 100).toFixed(2) : 0;

    const avgRepairTimeResult = queryOne(`
      SELECT AVG(julianday(completed_date) - julianday(created_at)) as avg_days
      FROM fault_reports 
      WHERE completed_date IS NOT NULL
    `);
    const avgRepairTime = avgRepairTimeResult ? (avgRepairTimeResult.avg_days || 0) : 0;

    res.json({
      funnel: { purchased, stored, inUse, maintained, scrapped },
      departmentHeatmap,
      indicators: {
        utilizationRate,
        maintenanceCostRate: parseFloat(maintenanceCostRate),
        avgRepairTime: Math.round(avgRepairTime * 24) // 转换为小时
      }
    });
  } catch (error) {
    console.error('Get lifecycle stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 自定义统计分析
router.get('/custom', authenticateToken, (req, res) => {
  try {
    const { period = 'month', department, type } = req.query;

    let dateFormat, dateRange;
    switch (period) {
      case 'year':
        dateFormat = '%Y';
        dateRange = '-3 years';
        break;
      case 'quarter':
        dateFormat = '%Y-Q';
        dateRange = '-2 years';
        break;
      default:
        dateFormat = '%Y-%m';
        dateRange = '-12 months';
    }

    let whereClause = `created_at >= date('now', '${dateRange}')`;
    const params = [];

    if (department) {
      whereClause += ' AND department = ?';
      params.push(department);
    }
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    // 设备新增趋势
    const equipmentTrend = query(`
      SELECT strftime('${dateFormat}', created_at) as period, COUNT(*) as count
      FROM equipment
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period
    `, params);

    // 采购金额趋势
    const purchaseTrend = query(`
      SELECT strftime('${dateFormat}', created_at) as period, 
        SUM(budget * quantity) as amount,
        COUNT(*) as count
      FROM purchase_requests
      WHERE created_at >= date('now', '${dateRange}')
      GROUP BY period
      ORDER BY period
    `);

    // 维护成本趋势
    const maintenanceTrend = query(`
      SELECT strftime('${dateFormat}', created_at) as period, 
        SUM(cost) as cost,
        COUNT(*) as count
      FROM maintenance_records
      WHERE created_at >= date('now', '${dateRange}')
      GROUP BY period
      ORDER BY period
    `);

    // 故障趋势
    const faultTrend = query(`
      SELECT strftime('${dateFormat}', created_at) as period, 
        COUNT(*) as count
      FROM fault_reports
      WHERE created_at >= date('now', '${dateRange}')
      GROUP BY period
      ORDER BY period
    `);

    res.json({
      equipmentTrend,
      purchaseTrend,
      maintenanceTrend,
      faultTrend
    });
  } catch (error) {
    console.error('Get custom stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 导出统计报告数据
router.get('/export', authenticateToken, (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // 汇总数据
    const totalEquipmentResult = queryOne('SELECT COUNT(*) as count FROM equipment');
    const activeEquipmentResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '正常使用'");
    const pendingMaintenanceResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '待维护'");
    const faultEquipmentResult = queryOne("SELECT COUNT(*) as count FROM equipment WHERE status = '故障停机'");
    const totalPurchaseAmountResult = queryOne('SELECT SUM(budget * quantity) as total FROM purchase_requests');
    const totalMaintenanceCostResult = queryOne('SELECT SUM(cost) as total FROM maintenance_records');
    const totalFaultCountResult = queryOne('SELECT COUNT(*) as count FROM fault_reports');
    const totalScrapCountResult = queryOne("SELECT COUNT(*) as count FROM scrap_requests WHERE status = '已报废'");

    const summary = {
      totalEquipment: totalEquipmentResult ? totalEquipmentResult.count : 0,
      activeEquipment: activeEquipmentResult ? activeEquipmentResult.count : 0,
      pendingMaintenance: pendingMaintenanceResult ? pendingMaintenanceResult.count : 0,
      faultEquipment: faultEquipmentResult ? faultEquipmentResult.count : 0,
      totalPurchaseAmount: totalPurchaseAmountResult ? (totalPurchaseAmountResult.total || 0) : 0,
      totalMaintenanceCost: totalMaintenanceCostResult ? (totalMaintenanceCostResult.total || 0) : 0,
      totalFaultCount: totalFaultCountResult ? totalFaultCountResult.count : 0,
      totalScrapCount: totalScrapCountResult ? totalScrapCountResult.count : 0
    };

    // 按科室统计
    const byDepartment = query(`
      SELECT department,
        COUNT(*) as total,
        SUM(CASE WHEN status = '正常使用' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = '待维护' THEN 1 ELSE 0 END) as pending_maintenance,
        SUM(CASE WHEN status = '故障停机' THEN 1 ELSE 0 END) as fault
      FROM equipment
      WHERE department IS NOT NULL
      GROUP BY department
    `);

    // 按类型统计
    const byType = query(`
      SELECT type,
        COUNT(*) as total,
        SUM(price) as total_value
      FROM equipment
      WHERE type IS NOT NULL
      GROUP BY type
    `);

    res.json({
      generatedAt: new Date().toISOString(),
      period,
      summary,
      byDepartment,
      byType
    });
  } catch (error) {
    console.error('Export stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
