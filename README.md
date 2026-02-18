# 医疗设备全周期管理平台

医疗设备全生命周期管理系统，涵盖设备采购、使用、维护、报废等全流程管理。

## 快速开始

### Docker部署（推荐）

```bash
# 克隆项目后，在根目录执行
docker compose up --build -d

# 等待服务启动完成后访问
# 管理后台: http://localhost:8082
# 后端API: http://localhost:3000

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 本地开发环境

#### 前置要求
- Node.js 18+
- npm 或 yarn

#### 后端启动
```bash
cd backend
npm install
npm run dev
# 服务运行在 http://localhost:3000
```

#### 前端启动
```bash
cd frontend-admin
npm install
npm run dev
# 服务运行在 http://localhost:5173
```

注意：本地开发时需要修改 `frontend-admin/src/utils/api.js` 中的 baseURL：
```javascript
// 开发环境
baseURL: 'http://localhost:3000/api'
```

## 服务信息

| 服务名称 | 端口 | 说明 |
|---------|------|------|
| frontend-admin | 8082 (Docker) / 5173 (本地) | 管理后台前端 |
| backend | 3000 | 后端API服务 |

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | user | user123 |

## 功能模块

### 1. 数据总览 (Dashboard)
- 核心指标卡片（设备总数、在役设备、待维护、高风险、本月采购）
- 设备状态分布饼图（可点击跳转）
- 设备类型与科室分布堆叠柱状图
- 维护计划进度展示
- 近期待办提醒

### 2. 设备台账管理
- 设备列表（筛选、搜索、分页）
- 设备新增、编辑、删除
- 批量操作（修改科室、责任人、标记报废）
- 导出CSV、批量导入
- 台账完整率和年限分布图表

### 3. 采购管理
- 采购申请卡片流
- 采购审批流程
- 入库确认
- 采购趋势分析
- 供应商管理

### 4. 维护管理
- 维护计划日历视图
- 维护完成率图表
- 故障报修看板
- 维护记录管理

### 5. 报废管理
- 报废状态分布图表
- 报废申请流程
- 报废审批
- 处置确认

### 6. 数据统计
- 核心运营指标
- 设备生命周期漏斗图
- 科室设备密度热力图
- 科室综合评估雷达图
- 自定义统计分析
- 导出统计报告

## 技术栈

- **前端**: Vue 3 + Element Plus + ECharts + Vue Router
- **后端**: Node.js + Express + sql.js (SQLite)
- **部署**: Docker + Docker Compose + Nginx

## 项目结构

```
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   ├── database.js     # 数据库配置
│   │   └── index.js        # 入口文件
│   ├── Dockerfile
│   └── package.json
├── frontend-admin/          # 前端管理后台
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── layouts/        # 布局组件
│   │   ├── router/         # 路由配置
│   │   ├── utils/          # 工具函数
│   │   └── styles/         # 全局样式
│   ├── Dockerfile
│   └── package.json
├── docs/                    # 文档
│   └── API.md              # API文档
├── docker-compose.yml
└── README.md
```


## 故障排查指南

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :8082
lsof -i :3000

# 修改docker-compose.yml中的端口映射
ports:
  - "8083:80"  # 改为其他端口
```

#### 2. Docker容器启动失败
```bash
# 查看容器日志
docker compose logs backend
docker compose logs frontend-admin

# 重新构建
docker compose down
docker compose up --build -d
```

#### 3. 数据库初始化失败
```bash
# 删除数据卷重新初始化
docker compose down -v
docker compose up --build -d
```

#### 4. 前端无法连接后端
- 检查后端服务是否正常运行：`curl http://localhost:3000/api/health`
- 检查nginx配置中的代理设置
- 确认CORS配置正确

#### 5. 登录失败
- 确认使用正确的测试账号：admin/admin123
- 检查后端日志是否有错误
- 清除浏览器缓存和localStorage

#### 6. 图表不显示
- 检查浏览器控制台是否有错误
- 确认ECharts正确加载
- 检查API返回数据格式

### 日志查看

```bash
# 查看所有服务日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 只看前端日志
docker compose logs -f frontend-admin

# 查看最近100行日志
docker compose logs --tail=100 backend
```

### 数据重置

```bash
# 完全重置（删除所有数据）
docker compose down -v
docker compose up --build -d

# 只重启服务（保留数据）
docker compose restart
```

## API文档

详细API文档请参考 [docs/API.md](docs/API.md)

## 数据初始化

系统首次启动时会自动初始化演示数据，包括：
- 2个测试用户（admin、user）
- 50台设备记录
- 20条采购申请
- 30条维护记录
- 15条故障报修
- 10条报废申请
- 5个供应商

如需重新初始化数据，请删除数据卷后重启：
```bash
docker compose down -v
docker compose up --build -d
```

## 开发说明

### 代码规范
- Vue组件使用 `<script setup>` 语法
- 所有文件包含详细注释
- API使用RESTful风格
- 使用结构化日志记录

### 安全特性
- JWT Token认证
- 密码复杂度校验
- 输入数据验证
- 关键操作审计日志

## License

MIT
