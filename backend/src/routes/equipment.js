/**
 * 设备台账管理路由
 * 提供设备的增删改查、批量操作、统计等功能
 * @module routes/equipment
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { 
  validateRequired, 
  isValidDate, 
  isValidEquipmentCode,
  isPositiveNumber,
  isValidEnum,
  EQUIPMENT_STATUS 
} = require('../utils/validator');

const router = express.Router();

// ==================== 设备列表查询 ====================

/**
 * GET /equipment
 * 获取设备列表（分页、筛选）
 * 
 * @query {number} page - 页码，默认1
 * @query {number} pageSize - 每页数量，默认10
 * @query {string} department - 科室筛选
 * @query {string} status - 状态筛选
 * @query {string} type - 类型筛选
 * @query {string} keyword - 关键词搜索（名称/编号）
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { page = 1, pageSize = 10, department, status, type, keyword } = req.query;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = '1=1';
    const params = [];

    if (department) {
      whereClause += ' AND department = ?';
      params.push(department);
    }
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    if (keyword) {
      whereClause += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 查询总数
    const totalResult = queryOne(`SELECT COUNT(*) as count FROM equipment WHERE ${whereClause}`, params);
    const total = totalResult ? totalResult.count : 0;
    
    // 查询列表数据
    const list = query(
      `SELECT * FROM equipment WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    logger.error('Equipment', 'GetList', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 单个设备查询 ====================

/**
 * GET /equipment/:id
 * 获取单个设备详情
 * 
 * @param {string} id - 设备ID
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const equipment = queryOne('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    if (!equipment) {
      return res.status(404).json({ message: '设备不存在' });
    }
    res.json(equipment);
  } catch (error) {
    logger.error('Equipment', 'GetOne', error, { id: req.params.id });
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 新增设备 ====================

/**
 * POST /equipment
 * 新增设备
 * 
 * @body {string} code - 设备编号（必填，唯一）
 * @body {string} name - 设备名称（必填）
 * @body {string} model - 型号
 * @body {string} type - 设备类型
 * @body {string} department - 所属科室
 * @body {string} purchase_date - 采购日期 (YYYY-MM-DD)
 * @body {number} service_years - 使用年限
 * @body {number} maintenance_cycle - 维护周期（天）
 * @body {string} responsible_person - 责任人
 * @body {string} supplier - 供应商
 * @body {number} price - 价格
 * @body {string} location - 存放位置
 * @body {string} description - 描述
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { 
      code, name, model, type, department, purchase_date, service_years, 
      maintenance_cycle, responsible_person, supplier, price, location, description 
    } = req.body;

    // 必填字段验证
    const validation = validateRequired(req.body, ['code', 'name']);
    if (!validation.valid) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${validation.missing.join(', ')}` 
      });
    }

    // 设备编号格式验证
    if (!isValidEquipmentCode(code)) {
      return res.status(400).json({ 
        message: '设备编号格式无效，应为字母开头，长度6-20位' 
      });
    }

    // 设备编号唯一性检查
    const existing = queryOne('SELECT id FROM equipment WHERE code = ?', [code]);
    if (existing) {
      return res.status(400).json({ message: '设备编号已存在' });
    }

    // 日期格式验证
    if (purchase_date && !isValidDate(purchase_date)) {
      return res.status(400).json({ message: '采购日期格式无效，应为YYYY-MM-DD' });
    }

    // 数值验证
    if (service_years && !isPositiveNumber(service_years)) {
      return res.status(400).json({ message: '使用年限必须为正数' });
    }
    if (maintenance_cycle && !isPositiveNumber(maintenance_cycle)) {
      return res.status(400).json({ message: '维护周期必须为正数' });
    }
    if (price && !isPositiveNumber(price)) {
      return res.status(400).json({ message: '价格必须为正数' });
    }

    const id = uuidv4();
    run(
      `INSERT INTO equipment (id, code, name, model, type, department, purchase_date, 
        service_years, maintenance_cycle, responsible_person, supplier, price, location, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, model || null, type || null, department || null, purchase_date || null, 
        service_years || null, maintenance_cycle || null, responsible_person || null, 
        supplier || null, price || null, location || null, description || null]
    );

    // 记录操作日志
    logger.audit('Equipment', 'Create', req.user?.username || 'system', {
      equipmentId: id,
      code,
      name
    });

    res.json({ message: '设备添加成功', id });
  } catch (error) {
    logger.error('Equipment', 'Create', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 更新设备 ====================

/**
 * PUT /equipment/:id
 * 更新设备信息
 * 
 * @param {string} id - 设备ID
 * @body {Object} - 设备字段（同新增）
 */
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { 
      name, model, type, department, purchase_date, service_years, status,
      maintenance_cycle, responsible_person, supplier, price, location, description 
    } = req.body;

    // 检查设备是否存在
    const existing = queryOne('SELECT id, code FROM equipment WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ message: '设备不存在' });
    }

    // 状态验证
    if (status && !isValidEnum(status, EQUIPMENT_STATUS)) {
      return res.status(400).json({ 
        message: `无效的状态值，允许值: ${EQUIPMENT_STATUS.join(', ')}` 
      });
    }

    // 日期格式验证
    if (purchase_date && !isValidDate(purchase_date)) {
      return res.status(400).json({ message: '采购日期格式无效' });
    }

    run(
      `UPDATE equipment SET name=?, model=?, type=?, department=?, purchase_date=?, 
        service_years=?, status=?, maintenance_cycle=?, responsible_person=?, supplier=?, 
        price=?, location=?, description=?, updated_at=datetime('now') WHERE id=?`,
      [name || null, model || null, type || null, department || null, purchase_date || null, 
        service_years || null, status || null, maintenance_cycle || null, responsible_person || null, 
        supplier || null, price || null, location || null, description || null, req.params.id]
    );

    // 记录操作日志
    logger.audit('Equipment', 'Update', req.user?.username || 'system', {
      equipmentId: req.params.id,
      code: existing.code
    });

    res.json({ message: '设备更新成功' });
  } catch (error) {
    logger.error('Equipment', 'Update', error, { id: req.params.id });
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 删除设备 ====================

/**
 * DELETE /equipment/:id
 * 删除设备（软删除建议，此处为硬删除）
 * 
 * @param {string} id - 设备ID
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    // 检查设备是否存在
    const existing = queryOne('SELECT id, code, name FROM equipment WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ message: '设备不存在' });
    }

    run('DELETE FROM equipment WHERE id = ?', [req.params.id]);

    // 记录操作日志（关键操作）
    logger.audit('Equipment', 'Delete', req.user?.username || 'system', {
      equipmentId: req.params.id,
      code: existing.code,
      name: existing.name
    });

    res.json({ message: '设备删除成功' });
  } catch (error) {
    logger.error('Equipment', 'Delete', error, { id: req.params.id });
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 批量更新 ====================

/**
 * POST /equipment/batch-update
 * 批量更新设备字段
 * 
 * @body {string[]} ids - 设备ID列表
 * @body {string} field - 要更新的字段
 * @body {string} value - 新值
 */
router.post('/batch-update', authenticateToken, (req, res) => {
  try {
    const { ids, field, value } = req.body;
    
    // 验证允许批量更新的字段
    const validFields = ['department', 'responsible_person', 'status'];
    if (!validFields.includes(field)) {
      return res.status(400).json({ 
        message: `不支持的字段，允许字段: ${validFields.join(', ')}` 
      });
    }

    // 验证ID列表
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要更新的设备' });
    }

    // 状态值验证
    if (field === 'status' && !isValidEnum(value, EQUIPMENT_STATUS)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 批量更新
    ids.forEach(id => {
      run(`UPDATE equipment SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [value, id]);
    });

    // 记录操作日志
    logger.audit('Equipment', 'BatchUpdate', req.user?.username || 'system', {
      ids,
      field,
      value,
      count: ids.length
    });

    res.json({ message: '批量更新成功' });
  } catch (error) {
    logger.error('Equipment', 'BatchUpdate', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 统计接口 ====================

/**
 * GET /equipment/stats/overview
 * 获取设备统计概览
 */
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    const totalResult = queryOne('SELECT COUNT(*) as count FROM equipment');
    const total = totalResult ? totalResult.count : 0;
    
    const byStatus = query('SELECT status, COUNT(*) as count FROM equipment GROUP BY status');
    const byType = query('SELECT type, COUNT(*) as count FROM equipment GROUP BY type');
    const byDepartment = query('SELECT department, COUNT(*) as count FROM equipment GROUP BY department');
    
    // 按使用年限分布
    const byYear = query(`
      SELECT 
        CASE 
          WHEN (julianday('now') - julianday(purchase_date)) / 365 <= 3 THEN '≤3年'
          WHEN (julianday('now') - julianday(purchase_date)) / 365 <= 5 THEN '3-5年'
          ELSE '>5年'
        END as year_range,
        COUNT(*) as count
      FROM equipment
      GROUP BY year_range
    `);

    res.json({ total, byStatus, byType, byDepartment, byYear });
  } catch (error) {
    logger.error('Equipment', 'GetStats', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 选项接口 ====================

/**
 * GET /equipment/options/departments
 * 获取科室列表（用于下拉选择）
 */
router.get('/options/departments', authenticateToken, (req, res) => {
  try {
    const departments = query('SELECT DISTINCT department FROM equipment WHERE department IS NOT NULL');
    res.json(departments.map(d => d.department));
  } catch (error) {
    logger.error('Equipment', 'GetDepartments', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * GET /equipment/options/types
 * 获取设备类型列表（用于下拉选择）
 */
router.get('/options/types', authenticateToken, (req, res) => {
  try {
    const types = query('SELECT DISTINCT type FROM equipment WHERE type IS NOT NULL');
    res.json(types.map(t => t.type));
  } catch (error) {
    logger.error('Equipment', 'GetTypes', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 二维码接口 ====================

/**
 * GET /equipment/:id/qrcode
 * 获取设备二维码信息
 * 
 * @param {string} id - 设备ID
 */
router.get('/:id/qrcode', authenticateToken, (req, res) => {
  try {
    const equipment = queryOne('SELECT code, name, department, responsible_person FROM equipment WHERE id = ?', [req.params.id]);
    if (!equipment) {
      return res.status(404).json({ message: '设备不存在' });
    }
    
    // 生成设备详情页URL（这里使用示例路径，实际项目中可能需要配置）
    const detailUrl = `${req.protocol}://${req.get('host')}/equipment/${req.params.id}`;
    
    res.json({
      code: equipment.code,
      name: equipment.name,
      department: equipment.department || '未分配',
      responsible_person: equipment.responsible_person || '未指定',
      detailUrl
    });
  } catch (error) {
    logger.error('Equipment', 'GetQRCode', error, { id: req.params.id });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
