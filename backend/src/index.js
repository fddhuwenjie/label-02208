/**
 * 医疗设备全周期管理平台 - 后端服务入口
 * 
 * 功能模块：
 * - 用户认证 (auth)
 * - 设备台账管理 (equipment)
 * - 采购管理 (purchase)
 * - 维护管理 (maintenance)
 * - 报废管理 (scrap)
 * - 数据统计 (statistics)
 * - 仪表盘 (dashboard)
 * 
 * @author Medical Equipment Team
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const { initialize } = require('./database');
const logger = require('./utils/logger');

// 导入路由模块
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const purchaseRoutes = require('./routes/purchase');
const maintenanceRoutes = require('./routes/maintenance');
const scrapRoutes = require('./routes/scrap');
const statisticsRoutes = require('./routes/statistics');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件配置 ====================

// 跨域配置
app.use(cors());

// JSON解析
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP', req.method, `${req.path} - ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// ==================== 路由配置 ====================

/**
 * 根路径 - API信息
 * 返回API基本信息和可用端点列表
 */
app.get('/', (req, res) => {
  res.json({
    name: '医疗设备全周期管理平台 API',
    version: '1.0.0',
    status: 'running',
    description: '提供医疗设备全生命周期管理功能，包括采购、使用、维护、报废等环节',
    frontend: 'http://localhost:8082',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health - 健康检查',
      auth: '/api/auth - 用户认证',
      equipment: '/api/equipment - 设备台账管理',
      purchase: '/api/purchase - 采购管理',
      maintenance: '/api/maintenance - 维护管理',
      scrap: '/api/scrap - 报废管理',
      statistics: '/api/statistics - 数据统计',
      dashboard: '/api/dashboard - 仪表盘数据'
    }
  });
});

/**
 * 健康检查端点
 * 用于监控服务运行状态
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 注册业务路由
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/scrap', scrapRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ==================== 错误处理 ====================

/**
 * 404错误处理
 */
app.use((req, res) => {
  res.status(404).json({ 
    message: '接口不存在',
    path: req.path 
  });
});

/**
 * 全局错误处理中间件
 */
app.use((err, req, res, next) => {
  logger.error('Server', 'UnhandledError', err, { path: req.path });
  res.status(500).json({ message: '服务器内部错误' });
});

// ==================== 服务启动 ====================

/**
 * 初始化数据库并启动HTTP服务
 */
async function start() {
  try {
    // 初始化数据库
    await initialize();
    logger.info('Database', 'Initialize', '数据库初始化完成');
    
    // 启动HTTP服务
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server', 'Start', `服务启动成功，端口: ${PORT}`);
      console.log(`\n医疗设备管理平台后端服务已启动`);
      console.log(`API地址: http://localhost:${PORT}`);
      console.log(`前端地址: http://localhost:8082\n`);
    });
  } catch (error) {
    logger.error('Server', 'StartFailed', error);
    process.exit(1);
  }
}

start();
