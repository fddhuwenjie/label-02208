/**
 * 日志工具模块
 * 提供结构化日志记录功能，支持不同级别的日志输出
 * @module utils/logger
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 * @param {Object} data - 附加数据
 * @returns {string} 格式化后的日志字符串
 */
function formatLog(level, module, action, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module,
    action,
    ...data
  };
  return JSON.stringify(logEntry);
}

/**
 * 记录错误日志
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 * @param {Error|Object} error - 错误对象或信息
 * @param {Object} context - 上下文信息
 */
function error(module, action, error, context = {}) {
  const data = {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  };
  console.error(formatLog(LOG_LEVELS.ERROR, module, action, data));
}

/**
 * 记录警告日志
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 * @param {string} message - 警告消息
 * @param {Object} context - 上下文信息
 */
function warn(module, action, message, context = {}) {
  console.warn(formatLog(LOG_LEVELS.WARN, module, action, { message, ...context }));
}

/**
 * 记录信息日志
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 * @param {string} message - 信息消息
 * @param {Object} context - 上下文信息
 */
function info(module, action, message, context = {}) {
  console.log(formatLog(LOG_LEVELS.INFO, module, action, { message, ...context }));
}

/**
 * 记录调试日志
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 * @param {string} message - 调试消息
 * @param {Object} context - 上下文信息
 */
function debug(module, action, message, context = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(formatLog(LOG_LEVELS.DEBUG, module, action, { message, ...context }));
  }
}

/**
 * 记录操作日志（用于关键业务操作审计）
 * @param {string} module - 模块名称
 * @param {string} action - 操作类型
 * @param {string} operator - 操作人
 * @param {Object} details - 操作详情
 */
function audit(module, action, operator, details = {}) {
  const data = {
    operator,
    operationType: action,
    details,
    auditTime: new Date().toISOString()
  };
  console.log(formatLog('AUDIT', module, action, data));
}

module.exports = {
  error,
  warn,
  info,
  debug,
  audit,
  LOG_LEVELS
};
