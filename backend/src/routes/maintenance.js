const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取维护记录列表
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, type, date } = req.query;
    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    if (date) {
      whereClause += ' AND scheduled_date = ?';
      params.push(date);
    }

    const list = query(`SELECT * FROM maintenance_records WHERE ${whereClause} ORDER BY scheduled_date`, params);
    res.json(list);
  } catch (error) {
    console.error('Get maintenance records error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取日历数据
router.get('/calendar', authenticateToken, (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const records = query(`
      SELECT scheduled_date, COUNT(*) as count
      FROM maintenance_records 
      WHERE scheduled_date BETWEEN ? AND ?
      GROUP BY scheduled_date
    `, [startDate, endDate]);

    res.json(records);
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 新增维护记录
router.post('/', authenticateToken, (req, res) => {
  try {
    const { equipment_id, equipment_name, type, scheduled_date, responsible_person, description } = req.body;
    const id = uuidv4();

    run(`INSERT INTO maintenance_records (id, equipment_id, equipment_name, type, 
      scheduled_date, responsible_person, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, equipment_id || null, equipment_name, type, scheduled_date, responsible_person, description || null, '待处理']);

    res.json({ message: '维护任务创建成功', id });
  } catch (error) {
    console.error('Add maintenance record error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新维护状态
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, result, cost } = req.body;
    const completedDate = status === '已完成' ? new Date().toISOString().split('T')[0] : null;

    run(`UPDATE maintenance_records SET status = ?, result = ?, cost = ?, 
      completed_date = ? WHERE id = ?`,
      [status, result || null, cost || null, completedDate, req.params.id]);

    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error('Update maintenance status error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取维护统计
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    // 本月完成率
    const currentMonth = new Date().toISOString().slice(0, 7);
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
    const currentYear = new Date().getFullYear().toString();
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

    // 各科室维护完成情况
    const byDepartment = query(`
      SELECT e.department, 
        COUNT(*) as total,
        SUM(CASE WHEN m.status = '已完成' THEN 1 ELSE 0 END) as completed
      FROM maintenance_records m
      LEFT JOIN equipment e ON m.equipment_id = e.id
      WHERE e.department IS NOT NULL
      GROUP BY e.department
    `);

    // 维护类型分布
    const byType = query('SELECT type, COUNT(*) as count FROM maintenance_records GROUP BY type');

    res.json({
      monthRate: monthTotal > 0 ? Math.round(monthCompleted / monthTotal * 100) : 0,
      yearCalibrationRate: yearCalibrationTotal > 0 ? Math.round(yearCalibrationCompleted / yearCalibrationTotal * 100) : 0,
      byDepartment,
      byType
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 故障报修相关
router.get('/faults', authenticateToken, (req, res) => {
  try {
    const { status, fault_type } = req.query;
    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (fault_type) {
      whereClause += ' AND fault_type = ?';
      params.push(fault_type);
    }

    const list = query(`SELECT * FROM fault_reports WHERE ${whereClause} ORDER BY created_at DESC`, params);
    res.json(list);
  } catch (error) {
    console.error('Get fault reports error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 新增故障报修
router.post('/faults', authenticateToken, (req, res) => {
  try {
    const { equipment_id, equipment_name, fault_type, description } = req.body;
    const id = uuidv4();
    const report_no = `FR${Date.now().toString().slice(-10)}`;

    run(`INSERT INTO fault_reports (id, report_no, equipment_id, equipment_name, 
      fault_type, description, reporter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, report_no, equipment_id || null, equipment_name, fault_type, description || null, 
        req.user.name || req.user.username, '待派单']);

    res.json({ message: '故障报修提交成功', id, report_no });
  } catch (error) {
    console.error('Add fault report error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新故障状态
router.put('/faults/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, repair_person, expected_date, cost } = req.body;
    const completedDate = status === '已完成' || status === '已关闭' 
      ? new Date().toISOString().split('T')[0] : null;

    run(`UPDATE fault_reports SET status = ?, repair_person = ?, expected_date = ?, 
      cost = ?, completed_date = ? WHERE id = ?`,
      [status, repair_person || null, expected_date || null, cost || null, completedDate, req.params.id]);

    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error('Update fault status error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 故障统计
router.get('/faults/stats', authenticateToken, (req, res) => {
  try {
    const byStatus = query('SELECT status, COUNT(*) as count FROM fault_reports GROUP BY status');
    const byType = query('SELECT fault_type, COUNT(*) as count FROM fault_reports GROUP BY fault_type');

    res.json({ byStatus, byType });
  } catch (error) {
    console.error('Get fault stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
