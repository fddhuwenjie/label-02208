/**
 * 输入验证工具模块
 * 提供各种数据验证函数，确保API输入数据的有效性
 * @module utils/validator
 */

/**
 * 验证必填字段
 * @param {Object} data - 待验证数据
 * @param {string[]} requiredFields - 必填字段列表
 * @returns {{ valid: boolean, missing: string[] }} 验证结果
 */
function validateRequired(data, requiredFields) {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 * @param {string} dateStr - 日期字符串
 * @returns {boolean} 是否为有效日期格式
 */
function isValidDate(dateStr) {
  if (!dateStr) return true; // 允许空值
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * 验证设备编号格式
 * @param {string} code - 设备编号
 * @returns {boolean} 是否为有效格式
 */
function isValidEquipmentCode(code) {
  if (!code) return false;
  // 设备编号格式：字母开头，后跟数字，长度6-20
  const regex = /^[A-Za-z][A-Za-z0-9-]{5,19}$/;
  return regex.test(code);
}

/**
 * 验证申请单号格式
 * @param {string} requestNo - 申请单号
 * @returns {boolean} 是否为有效格式
 */
function isValidRequestNo(requestNo) {
  if (!requestNo) return false;
  // 申请单号格式：2-3个字母开头，后跟6位数字
  const regex = /^[A-Z]{2,3}\d{6}$/;
  return regex.test(requestNo);
}

/**
 * 验证数值范围
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在有效范围内
 */
function isInRange(value, min, max) {
  if (value === undefined || value === null) return true;
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * 验证正数
 * @param {number} value - 数值
 * @returns {boolean} 是否为正数
 */
function isPositiveNumber(value) {
  if (value === undefined || value === null) return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * 验证非负数
 * @param {number} value - 数值
 * @returns {boolean} 是否为非负数
 */
function isNonNegative(value) {
  if (value === undefined || value === null) return true;
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * 验证枚举值
 * @param {string} value - 待验证值
 * @param {string[]} allowedValues - 允许的值列表
 * @returns {boolean} 是否为有效枚举值
 */
function isValidEnum(value, allowedValues) {
  if (!value) return true;
  return allowedValues.includes(value);
}

/**
 * 验证字符串长度
 * @param {string} str - 字符串
 * @param {number} minLen - 最小长度
 * @param {number} maxLen - 最大长度
 * @returns {boolean} 是否在有效长度范围内
 */
function isValidLength(str, minLen, maxLen) {
  if (!str) return minLen === 0;
  return str.length >= minLen && str.length <= maxLen;
}

/**
 * 清理和转义用户输入，防止SQL注入
 * @param {string} input - 用户输入
 * @returns {string} 清理后的输入
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // 移除潜在的SQL注入字符
  return input.replace(/['"\\;]/g, '');
}

/**
 * 设备状态枚举
 */
const EQUIPMENT_STATUS = ['正常使用', '待维护', '故障停机', '待报废', '已报废'];

/**
 * 采购状态枚举
 */
const PURCHASE_STATUS = ['待审批', '已审批', '已入库', '已驳回'];

/**
 * 维护类型枚举
 */
const MAINTENANCE_TYPES = ['日常维护', '校准', '故障维修'];

/**
 * 维护状态枚举
 */
const MAINTENANCE_STATUS = ['待处理', '进行中', '已完成'];

/**
 * 故障类型枚举
 */
const FAULT_TYPES = ['硬件', '软件', '操作失误'];

/**
 * 报废状态枚举
 */
const SCRAP_STATUS = ['待审核', '审核通过待处置', '已报废', '报废驳回'];

module.exports = {
  validateRequired,
  isValidDate,
  isValidEquipmentCode,
  isValidRequestNo,
  isInRange,
  isPositiveNumber,
  isNonNegative,
  isValidEnum,
  isValidLength,
  sanitizeInput,
  EQUIPMENT_STATUS,
  PURCHASE_STATUS,
  MAINTENANCE_TYPES,
  MAINTENANCE_STATUS,
  FAULT_TYPES,
  SCRAP_STATUS
};
