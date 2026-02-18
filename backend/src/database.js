const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/medical.db' 
  : path.join(__dirname, '../medical.db');

let db = null;

async function getDb() {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }
  
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  }
}

// 定期保存数据库
setInterval(saveDb, 30000);

// 进程退出时保存
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

async function initialize() {
  const database = await getDb();
  
  // 用户表
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      name TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 设备表
  database.run(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      model TEXT,
      type TEXT,
      department TEXT,
      purchase_date DATE,
      service_years INTEGER DEFAULT 5,
      status TEXT DEFAULT '正常使用',
      maintenance_cycle INTEGER DEFAULT 30,
      responsible_person TEXT,
      supplier TEXT,
      price REAL,
      location TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 采购申请表
  database.run(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      request_no TEXT UNIQUE NOT NULL,
      equipment_name TEXT NOT NULL,
      model TEXT,
      type TEXT,
      department TEXT,
      quantity INTEGER DEFAULT 1,
      budget REAL,
      reason TEXT,
      applicant TEXT,
      approver TEXT,
      status TEXT DEFAULT '待审批',
      reject_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      stored_at DATETIME
    )
  `);

  // 供应商表
  database.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      phone TEXT,
      equipment_types TEXT,
      total_amount REAL DEFAULT 0,
      rating INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 维护记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      equipment_id TEXT,
      equipment_name TEXT,
      type TEXT DEFAULT '日常维护',
      scheduled_date DATE,
      completed_date DATE,
      responsible_person TEXT,
      status TEXT DEFAULT '待处理',
      description TEXT,
      result TEXT,
      cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 故障报修表
  database.run(`
    CREATE TABLE IF NOT EXISTS fault_reports (
      id TEXT PRIMARY KEY,
      report_no TEXT UNIQUE NOT NULL,
      equipment_id TEXT,
      equipment_name TEXT,
      fault_type TEXT DEFAULT '硬件',
      description TEXT,
      reporter TEXT,
      repair_person TEXT,
      status TEXT DEFAULT '待派单',
      expected_date DATE,
      completed_date DATE,
      cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 报废申请表
  database.run(`
    CREATE TABLE IF NOT EXISTS scrap_requests (
      id TEXT PRIMARY KEY,
      equipment_id TEXT,
      equipment_code TEXT,
      equipment_name TEXT,
      reason TEXT,
      assessed_value REAL,
      applicant TEXT,
      approver TEXT,
      status TEXT DEFAULT '待审核',
      disposal_method TEXT,
      reject_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      disposed_at DATETIME
    )
  `);

  // 插入默认用户
  const adminExists = database.exec("SELECT id FROM users WHERE username = 'admin'");
  if (!adminExists.length || !adminExists[0].values.length) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    database.run('INSERT INTO users (id, username, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'admin', hashedPassword, 'admin', '系统管理员', '信息科']);
    
    const userPassword = bcrypt.hashSync('user123', 10);
    database.run('INSERT INTO users (id, username, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'user', userPassword, 'user', '普通用户', '设备科']);
  }

  // 插入示例数据
  const equipmentExists = database.exec('SELECT COUNT(*) as count FROM equipment');
  if (!equipmentExists.length || equipmentExists[0].values[0][0] === 0) {
    insertSampleData(database);
  }

  saveDb();
  console.log('Database initialized successfully');
}

function insertSampleData(database) {
  const departments = ['放射科', '检验科', '急诊科', '康复科', 'ICU', '手术室', '内科', '外科'];
  const types = ['检验设备', '影像设备', '急救设备', '康复设备', '监护设备', '手术设备'];
  const statuses = ['正常使用', '正常使用', '正常使用', '待维护', '故障停机', '待报废'];
  const suppliers = ['西门子医疗', '飞利浦医疗', 'GE医疗', '迈瑞医疗', '联影医疗'];

  // 插入供应商
  suppliers.forEach((name, index) => {
    database.run(`INSERT INTO suppliers (id, name, contact, phone, equipment_types, total_amount, rating) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), name, `联系人${index + 1}`, `1380000${1000 + index}`, 
        types.slice(0, 3).join(','), Math.floor(Math.random() * 5000000) + 1000000, 
        Math.floor(Math.random() * 2) + 4]);
  });

  // 插入设备
  const equipmentNames = [
    'CT扫描仪', 'MRI核磁共振', 'X光机', '超声诊断仪', '心电监护仪',
    '呼吸机', '血液分析仪', '生化分析仪', '除颤仪', '麻醉机',
    '手术床', '无影灯', '康复训练器', '血透机', '内窥镜'
  ];

  for (let i = 0; i < 50; i++) {
    const name = equipmentNames[i % equipmentNames.length];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const year = 2019 + Math.floor(Math.random() * 5);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

    database.run(`INSERT INTO equipment (id, code, name, model, type, department, purchase_date, 
      service_years, status, maintenance_cycle, responsible_person, supplier, price, location) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        `EQ${String(i + 1).padStart(6, '0')}`,
        name,
        `${name.substring(0, 2)}-${1000 + i}`,
        type,
        dept,
        `${year}-${month}-${day}`,
        Math.floor(Math.random() * 5) + 3,
        status,
        Math.floor(Math.random() * 60) + 30,
        `责任人${Math.floor(Math.random() * 10) + 1}`,
        supplier,
        Math.floor(Math.random() * 900000) + 100000,
        `${dept}${Math.floor(Math.random() * 5) + 1}号房`
      ]);
  }

  // 插入采购申请
  const purchaseStatuses = ['待审批', '已审批', '已入库', '已驳回'];
  for (let i = 0; i < 20; i++) {
    const status = purchaseStatuses[Math.floor(Math.random() * purchaseStatuses.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const name = equipmentNames[Math.floor(Math.random() * equipmentNames.length)];
    
    database.run(`INSERT INTO purchase_requests (id, request_no, equipment_name, model, type, 
      department, quantity, budget, reason, applicant, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        `PR${String(i + 1).padStart(6, '0')}`,
        name,
        `${name.substring(0, 2)}-NEW`,
        types[Math.floor(Math.random() * types.length)],
        dept,
        Math.floor(Math.random() * 3) + 1,
        Math.floor(Math.random() * 500000) + 50000,
        '科室业务需要',
        `申请人${Math.floor(Math.random() * 5) + 1}`,
        status,
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      ]);
  }

  // 插入维护记录
  const maintenanceTypes = ['日常维护', '校准', '故障维修'];
  const maintenanceStatuses = ['待处理', '进行中', '已完成'];
  for (let i = 0; i < 30; i++) {
    const type = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    const status = maintenanceStatuses[Math.floor(Math.random() * maintenanceStatuses.length)];
    const name = equipmentNames[Math.floor(Math.random() * equipmentNames.length)];
    const scheduledDate = new Date(Date.now() + (Math.random() - 0.5) * 60 * 24 * 60 * 60 * 1000);
    
    database.run(`INSERT INTO maintenance_records (id, equipment_name, type, scheduled_date, 
      responsible_person, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        name,
        type,
        scheduledDate.toISOString().split('T')[0],
        `维护人员${Math.floor(Math.random() * 5) + 1}`,
        status,
        `${type}任务`
      ]);
  }

  // 插入故障报修
  const faultTypes = ['硬件', '软件', '操作失误'];
  const faultStatuses = ['待派单', '维修中', '已完成', '已关闭'];
  for (let i = 0; i < 15; i++) {
    const faultType = faultTypes[Math.floor(Math.random() * faultTypes.length)];
    const status = faultStatuses[Math.floor(Math.random() * faultStatuses.length)];
    const name = equipmentNames[Math.floor(Math.random() * equipmentNames.length)];
    
    database.run(`INSERT INTO fault_reports (id, report_no, equipment_name, fault_type, 
      description, reporter, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        `FR${String(i + 1).padStart(6, '0')}`,
        name,
        faultType,
        `${faultType}故障：设备异常`,
        `报修人${Math.floor(Math.random() * 5) + 1}`,
        status,
        new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString()
      ]);
  }

  // 插入报废申请
  const scrapReasons = ['老化', '故障无法修复', '技术淘汰'];
  const scrapStatuses = ['待审核', '审核通过待处置', '已报废', '报废驳回'];
  for (let i = 0; i < 10; i++) {
    const reason = scrapReasons[Math.floor(Math.random() * scrapReasons.length)];
    const status = scrapStatuses[Math.floor(Math.random() * scrapStatuses.length)];
    const name = equipmentNames[Math.floor(Math.random() * equipmentNames.length)];
    
    database.run(`INSERT INTO scrap_requests (id, equipment_code, equipment_name, reason, 
      assessed_value, applicant, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        `EQ${String(Math.floor(Math.random() * 50) + 1).padStart(6, '0')}`,
        name,
        reason,
        Math.floor(Math.random() * 50000) + 5000,
        `申请人${Math.floor(Math.random() * 5) + 1}`,
        status,
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      ]);
  }

  console.log('Sample data inserted successfully');
}

// 辅助函数：执行查询并返回结果
function query(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

// 辅助函数：执行单条查询
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

// 辅助函数：执行更新/插入
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

module.exports = { initialize, getDb, query, queryOne, run, saveDb };
