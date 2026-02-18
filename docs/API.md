# 医疗设备全周期管理平台 API 文档

## 概述

- **基础URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`

## 认证

### 登录
```
POST /auth/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "name": "系统管理员",
    "department": "信息科"
  }
}
```

**测试账号**:
- 管理员: `admin` / `admin123`
- 普通用户: `user` / `user123`

---

## 设备管理 `/equipment`

### 获取设备列表
```
GET /equipment
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| department | string | 否 | 科室筛选 |
| status | string | 否 | 状态筛选 |
| type | string | 否 | 类型筛选 |
| keyword | string | 否 | 关键词搜索 |

**响应**:
```json
{
  "list": [
    {
      "id": "uuid",
      "code": "EQ000001",
      "name": "CT扫描仪",
      "model": "CT-1000",
      "type": "影像设备",
      "department": "放射科",
      "purchase_date": "2023-01-15",
      "service_years": 5,
      "status": "正常使用",
      "maintenance_cycle": 30,
      "responsible_person": "张三",
      "supplier": "西门子医疗",
      "price": 500000,
      "location": "放射科1号房"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 10
}
```

### 获取单个设备
```
GET /equipment/:id
```

**响应**: 单个设备对象

### 新增设备
```
POST /equipment
```

**请求体**:
```json
{
  "code": "EQ000051",
  "name": "心电监护仪",
  "model": "PM-9000",
  "type": "监护设备",
  "department": "心内科",
  "purchase_date": "2024-01-01",
  "service_years": 5,
  "maintenance_cycle": 30,
  "responsible_person": "李四",
  "supplier": "迈瑞医疗",
  "price": 80000,
  "location": "心内科2号房",
  "description": "新采购设备"
}
```

**必填字段**: `code`, `name`

**响应**:
```json
{
  "message": "设备添加成功",
  "id": "uuid"
}
```

### 更新设备
```
PUT /equipment/:id
```

**请求体**: 同新增（不含code）

**响应**:
```json
{
  "message": "设备更新成功"
}
```

### 删除设备
```
DELETE /equipment/:id
```

**响应**:
```json
{
  "message": "设备删除成功"
}
```

### 批量更新
```
POST /equipment/batch-update
```

**请求体**:
```json
{
  "ids": ["uuid1", "uuid2"],
  "field": "department",
  "value": "急诊科"
}
```

**允许字段**: `department`, `responsible_person`, `status`

### 获取科室列表
```
GET /equipment/options/departments
```

**响应**: `["放射科", "检验科", "急诊科", ...]`

### 获取设备类型列表
```
GET /equipment/options/types
```

**响应**: `["检验设备", "影像设备", "急救设备", ...]`

---

## 采购管理 `/purchase`

### 获取采购申请列表
```
GET /purchase
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |
| status | string | 状态筛选 |
| department | string | 科室筛选 |

**响应**:
```json
{
  "list": [
    {
      "id": "uuid",
      "request_no": "PR000001",
      "equipment_name": "呼吸机",
      "model": "V60",
      "type": "急救设备",
      "department": "ICU",
      "quantity": 2,
      "budget": 150000,
      "reason": "科室扩建需要",
      "applicant": "王医生",
      "status": "待审批",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 20
}
```

### 新增采购申请
```
POST /purchase
```

**请求体**:
```json
{
  "equipment_name": "呼吸机",
  "model": "V60",
  "type": "急救设备",
  "department": "ICU",
  "quantity": 2,
  "budget": 150000,
  "reason": "科室扩建需要"
}
```

### 审批采购申请
```
PUT /purchase/:id/approve
```

**请求体**:
```json
{
  "approved": true,
  "reject_reason": ""
}
```

### 入库确认
```
PUT /purchase/:id/store
```

---

## 维护管理 `/maintenance`

### 获取维护记录列表
```
GET /maintenance
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 维护类型：日常维护/校准/故障维修 |
| status | string | 状态：待处理/进行中/已完成 |

### 新增维护记录
```
POST /maintenance
```

**请求体**:
```json
{
  "equipment_id": "uuid",
  "equipment_name": "CT扫描仪",
  "type": "日常维护",
  "scheduled_date": "2024-02-01",
  "responsible_person": "维护员A",
  "description": "定期保养"
}
```

### 更新维护状态
```
PUT /maintenance/:id
```

### 获取故障报修列表
```
GET /maintenance/faults
```

### 新增故障报修
```
POST /maintenance/faults
```

**请求体**:
```json
{
  "equipment_id": "uuid",
  "equipment_name": "X光机",
  "fault_type": "硬件",
  "description": "显示屏无法正常显示",
  "reporter": "张护士"
}
```

---

## 报废管理 `/scrap`

### 获取报废申请列表
```
GET /scrap
```

### 新增报废申请
```
POST /scrap
```

**请求体**:
```json
{
  "equipment_id": "uuid",
  "equipment_code": "EQ000010",
  "equipment_name": "老旧监护仪",
  "reason": "设备老化，无法正常使用",
  "assessed_value": 5000
}
```

### 审批报废申请
```
PUT /scrap/:id/approve
```

**请求体**:
```json
{
  "approved": true,
  "disposal_method": "回收处理",
  "reject_reason": ""
}
```

### 确认报废处置
```
PUT /scrap/:id/dispose
```

---

## 仪表盘 `/dashboard`

### 获取核心指标
```
GET /dashboard/indicators
```

**响应**:
```json
{
  "total": 50,
  "active": 40,
  "pendingMaintenance": 5,
  "fault": 3,
  "highRisk": 2,
  "monthlyPurchase": 8,
  "purchaseGrowth": 15
}
```

### 获取设备状态分布
```
GET /dashboard/status-distribution
```

**响应**:
```json
[
  { "status": "正常使用", "count": 40 },
  { "status": "待维护", "count": 5 },
  { "status": "故障停机", "count": 3 }
]
```

### 获取维护进度
```
GET /dashboard/maintenance-progress
```

### 获取待办提醒
```
GET /dashboard/todos
```

---

## 数据统计 `/statistics`

### 获取生命周期统计
```
GET /statistics/lifecycle
```

**响应**:
```json
{
  "funnel": {
    "purchased": 100,
    "stored": 80,
    "inUse": 50,
    "maintained": 45,
    "scrapped": 10
  },
  "departmentHeatmap": [...],
  "indicators": {
    "utilizationRate": 80,
    "maintenanceCostRate": 2.5,
    "avgRepairTime": 24
  }
}
```

### 获取自定义统计
```
GET /statistics/custom
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | 周期：month/quarter/year |
| department | string | 科室筛选 |
| type | string | 类型筛选 |

### 导出统计数据
```
GET /statistics/export
```

---

## 错误响应

所有错误响应格式：
```json
{
  "message": "错误描述"
}
```

**常见状态码**:
- `400` - 请求参数错误
- `401` - 未授权（Token无效或过期）
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## 状态枚举值

### 设备状态
- `正常使用`
- `待维护`
- `故障停机`
- `待报废`
- `已报废`

### 采购状态
- `待审批`
- `已审批`
- `已入库`
- `已驳回`

### 维护类型
- `日常维护`
- `校准`
- `故障维修`

### 维护状态
- `待处理`
- `进行中`
- `已完成`

### 报废状态
- `待审核`
- `审核通过待处置`
- `已报废`
- `报废驳回`
