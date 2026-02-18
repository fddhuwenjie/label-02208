const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取报废申请列表
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM scrap_requests';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const list = query(sql, params);
    res.json(list);
  } catch (error) {
    console.error('Get scrap requests error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个报废申请
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const request = queryOne('SELECT * FROM scrap_requests WHERE id = ?', [req.params.id]);
    if (!request) {
      return res.status(404).json({ message: '报废申请不存在' });
    }
    res.json(request);
  } catch (error) {
    console.error('Get scrap request error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 新增报废申请
router.post('/', authenticateToken, (req, res) => {
  try {
    const { equipment_id, equipment_code, equipment_name, reason, assessed_value } = req.body;
    const id = uuidv4();

    run(`INSERT INTO scrap_requests (id, equipment_id, equipment_code, equipment_name, 
      reason, assessed_value, applicant, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, equipment_id, equipment_code, equipment_name, reason, assessed_value, 
        req.user.name || req.user.username, '待审核']);

    // 更新设备状态为待报废
    if (equipment_id) {
      run("UPDATE equipment SET status = '待报废' WHERE id = ?", [equipment_id]);
    }

    res.json({ message: '报废申请提交成功', id });
  } catch (error) {
    console.error('Add scrap request error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 审核报废申请
router.post('/:id/approve', authenticateToken, (req, res) => {
  try {
    const { approved, reject_reason } = req.body;
    const status = approved ? '审核通过待处置' : '报废驳回';

    run(`UPDATE scrap_requests SET status = ?, approver = ?, reject_reason = ?, 
      approved_at = datetime('now') WHERE id = ?`,
      [status, req.user.name || req.user.username, reject_reason || null, req.params.id]);

    // 如果驳回，恢复设备状态
    if (!approved) {
      const request = queryOne('SELECT equipment_id FROM scrap_requests WHERE id = ?', [req.params.id]);
      if (request && request.equipment_id) {
        run("UPDATE equipment SET status = '正常使用' WHERE id = ?", [request.equipment_id]);
      }
    }

    res.json({ message: approved ? '审核通过' : '已驳回' });
  } catch (error) {
    console.error('Approve scrap request error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 标记处置完成
router.post('/:id/dispose', authenticateToken, (req, res) => {
  try {
    const { disposal_method } = req.body;

    run(`UPDATE scrap_requests SET status = '已报废', disposal_method = ?, 
      disposed_at = datetime('now') WHERE id = ?`,
      [disposal_method, req.params.id]);

    // 更新设备状态为已报废
    const request = queryOne('SELECT equipment_id FROM scrap_requests WHERE id = ?', [req.params.id]);
    if (request && request.equipment_id) {
      run("UPDATE equipment SET status = '已报废' WHERE id = ?", [request.equipment_id]);
    }

    res.json({ message: '处置完成' });
  } catch (error) {
    console.error('Dispose scrap request error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取报废统计
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    const byStatus = query('SELECT status, COUNT(*) as count FROM scrap_requests GROUP BY status');
    const byReason = query('SELECT reason, COUNT(*) as count FROM scrap_requests GROUP BY reason');
    
    // 各科室报废数量
    const byDepartment = query(`
      SELECT e.department, COUNT(*) as count
      FROM scrap_requests s
      LEFT JOIN equipment e ON s.equipment_id = e.id
      WHERE e.department IS NOT NULL
      GROUP BY e.department
      ORDER BY count DESC
    `);

    // 近6个月报废趋势
    const monthlyTrend = query(`
      SELECT strftime('%Y-%m', created_at) as month, 
        COUNT(*) as count,
        SUM(assessed_value) as amount
      FROM scrap_requests 
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `);

    res.json({ byStatus, byReason, byDepartment, monthlyTrend });
  } catch (error) {
    console.error('Get scrap stats error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
