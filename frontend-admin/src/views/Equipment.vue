<!--
  设备台账管理页面
  功能：
  - 设备列表展示（分页、筛选、搜索）
  - 设备新增、编辑、删除
  - 批量操作（修改科室、责任人、标记报废）
  - 导出Excel/CSV
  - 批量导入
  - 台账完整率和年限分布图表
  
  @author Medical Equipment Team
  @version 1.0.0
-->
<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">设备台账管理</h1>
      <div class="header-actions">
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
        <el-button @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增设备
        </el-button>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧表格区域 -->
      <div class="table-section">
        <!-- 筛选区 -->
        <div class="filter-bar medical-card">
          <el-input v-model="filters.keyword" placeholder="搜索设备名称/编号" clearable style="width: 200px" @keyup.enter="fetchList">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.department" placeholder="选择科室" clearable style="width: 140px" @change="fetchList">
            <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
          </el-select>
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 140px" @change="fetchList">
            <el-option label="正常使用" value="正常使用" />
            <el-option label="待维护" value="待维护" />
            <el-option label="故障停机" value="故障停机" />
            <el-option label="待报废" value="待报废" />
            <el-option label="已报废" value="已报废" />
          </el-select>
          <el-select v-model="filters.type" placeholder="选择类型" clearable style="width: 140px" @change="fetchList">
            <el-option v-for="t in types" :key="t" :label="t" :value="t" />
          </el-select>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <!-- 批量操作栏 -->
        <div class="batch-bar" v-if="selectedIds.length">
          <span>已选择 {{ selectedIds.length }} 项</span>
          <el-button size="small" @click="showBatchDialog('department')">批量修改科室</el-button>
          <el-button size="small" @click="showBatchDialog('responsible_person')">批量修改责任人</el-button>
          <el-button size="small" type="danger" @click="showBatchDialog('status')">批量标记待报废</el-button>
        </div>

        <!-- 数据表格 -->
        <div class="medical-card table-card">
          <el-table 
            :data="tableData" 
            v-loading="loading"
            @selection-change="handleSelectionChange"
            height="100%"
            stripe
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="code" label="设备编号" width="120" fixed />
            <el-table-column prop="name" label="设备名称" min-width="140" />
            <el-table-column prop="model" label="型号" width="120" />
            <el-table-column prop="department" label="所属科室" width="100" />
            <el-table-column prop="purchase_date" label="采购日期" width="110" />
            <el-table-column prop="service_years" label="使用年限" width="90" align="center">
              <template #default="{ row }">{{ row.service_years }}年</template>
            </el-table-column>
            <el-table-column prop="status" label="当前状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="maintenance_cycle" label="维护周期" width="90" align="center">
              <template #default="{ row }">{{ row.maintenance_cycle }}天</template>
            </el-table-column>
            <el-table-column prop="responsible_person" label="责任人" width="100" />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
                <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
                <el-button link type="primary" size="small" @click="handleViewMaintenance(row)">维护记录</el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchList"
              @current-change="fetchList"
            />
          </div>
        </div>
      </div>

      <!-- 右侧图表区域 -->
      <div class="chart-section">
        <div class="medical-card">
          <h3>台账信息完整率</h3>
          <div class="chart-container" ref="completenessChartRef"></div>
        </div>
        <div class="medical-card">
          <h3>设备使用年限分布</h3>
          <div class="chart-container" ref="yearChartRef"></div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编号" prop="code">
              <el-input v-model="form.code" :disabled="isEdit" placeholder="如: EQ000001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in types" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属科室">
              <el-select v-model="form.department" style="width: 100%">
                <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker v-model="form.purchase_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="使用年限">
              <el-input-number v-model="form.service_years" :min="1" :max="30" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维护周期(天)">
              <el-input-number v-model="form.maintenance_cycle" :min="1" :max="365" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="责任人">
              <el-input v-model="form.responsible_person" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商">
              <el-input v-model="form.supplier" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="存放位置">
              <el-input v-model="form.location" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="设备状态" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常使用" value="正常使用" />
            <el-option label="待维护" value="待维护" />
            <el-option label="故障停机" value="故障停机" />
            <el-option label="待报废" value="待报废" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="设备详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="设备编号">{{ currentRow.code }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ currentRow.name }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ currentRow.model }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ currentRow.type }}</el-descriptions-item>
        <el-descriptions-item label="所属科室">{{ currentRow.department }}</el-descriptions-item>
        <el-descriptions-item label="采购日期">{{ currentRow.purchase_date }}</el-descriptions-item>
        <el-descriptions-item label="使用年限">{{ currentRow.service_years }}年</el-descriptions-item>
        <el-descriptions-item label="维护周期">{{ currentRow.maintenance_cycle }}天</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(currentRow.status)">{{ currentRow.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="责任人">{{ currentRow.responsible_person }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ currentRow.supplier }}</el-descriptions-item>
        <el-descriptions-item label="价格">¥{{ currentRow.price?.toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="存放位置" :span="2">{{ currentRow.location }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentRow.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleGenerateQRCode">生成二维码</el-button>
      </template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrCodeDialogVisible" title="设备二维码标签" width="400px" @opened="handleDialogOpened">
      <div class="qrcode-container">
        <div class="qrcode-info">
          <p><strong>设备编号：</strong>{{ qrCodeData.code || '-' }}</p>
          <p><strong>设备名称：</strong>{{ qrCodeData.name || '-' }}</p>
          <p><strong>所属科室：</strong>{{ qrCodeData.department || '-' }}</p>
          <p><strong>责任人：</strong>{{ qrCodeData.responsible_person || '-' }}</p>
        </div>
        <div class="qrcode-image" ref="qrcodeImageRef" v-loading="qrCodeLoading">
          <canvas v-show="!qrCodeLoading" ref="qrcodeCanvasRef"></canvas>
        </div>
      </div>
      <template #footer>
        <el-button @click="qrCodeDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleDownloadQRCode" :disabled="qrCodeLoading">下载PNG</el-button>
      </template>
    </el-dialog>

    <!-- 批量操作对话框 -->
    <el-dialog v-model="batchDialogVisible" title="批量操作" width="400px">
      <el-form label-width="80px">
        <el-form-item :label="batchField === 'department' ? '科室' : batchField === 'responsible_person' ? '责任人' : '状态'">
          <el-select v-model="batchValue" style="width: 100%" v-if="batchField === 'department'">
            <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
          </el-select>
          <el-input v-model="batchValue" v-else-if="batchField === 'responsible_person'" />
          <el-select v-model="batchValue" style="width: 100%" v-else disabled>
            <el-option label="待报废" value="待报废" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入" width="500px">
      <div class="import-tips">
        <p>请按照模板格式准备CSV文件，包含以下列：</p>
        <p>设备编号、设备名称、型号、设备类型、所属科室、采购日期、使用年限、维护周期、责任人、供应商、价格、存放位置</p>
        <el-button type="primary" link @click="downloadTemplate">下载导入模板</el-button>
      </div>
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        accept=".csv"
        :on-change="handleFileChange"
        :file-list="importFileList"
      >
        <el-icon :size="48"><Upload /></el-icon>
        <div>将CSV文件拖到此处，或点击上传</div>
      </el-upload>
      <div v-if="importPreview.length" class="import-preview">
        <h4>预览数据（前5条）</h4>
        <el-table :data="importPreview" size="small" max-height="200">
          <el-table-column prop="code" label="编号" width="100" />
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="department" label="科室" width="80" />
          <el-table-column prop="type" label="类型" width="80" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :disabled="!importPreview.length">导入</el-button>
      </template>
    </el-dialog>

    <!-- 维护记录对话框 -->
    <el-dialog v-model="maintenanceDialogVisible" :title="`${currentRow.name} - 维护记录`" width="700px">
      <div class="maintenance-records" v-loading="maintenanceLoading">
        <el-empty v-if="!maintenanceLoading && !maintenanceRecords.length" description="暂无维护记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="record in maintenanceRecords"
            :key="record.id"
            :timestamp="record.scheduled_date"
            :type="record.status === '已完成' ? 'success' : record.status === '进行中' ? 'primary' : 'warning'"
            placement="top"
          >
            <div class="record-card">
              <div class="record-header">
                <el-tag :type="getMaintenanceTypeTag(record.type)" size="small">{{ record.type }}</el-tag>
                <el-tag :type="record.status === '已完成' ? 'success' : 'warning'" size="small">{{ record.status }}</el-tag>
              </div>
              <div class="record-info">
                <span>负责人：{{ record.responsible_person }}</span>
                <span v-if="record.cost">费用：¥{{ record.cost }}</span>
              </div>
              <div class="record-desc" v-if="record.description">{{ record.description }}</div>
              <div class="record-result" v-if="record.result">结果：{{ record.result }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <template #footer>
        <el-button @click="maintenanceDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToMaintenance">前往维护管理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 设备台账管理页面脚本
 * 
 * 主要功能：
 * 1. 设备列表的增删改查
 * 2. 批量操作（修改科室、责任人、状态）
 * 3. 导出CSV功能
 * 4. 批量导入功能（CSV解析）
 * 5. 图表展示（完整率、年限分布）
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import QRCode from 'qrcode'
import api from '../utils/api'

// ==================== 路由 ====================
const router = useRouter()

// ==================== 状态定义 ====================

/** 加载状态 */
const loading = ref(false)
/** 表格数据 */
const tableData = ref([])
/** 选中的设备ID列表 */
const selectedIds = ref([])
/** 科室选项 */
const departments = ref([])
/** 设备类型选项 */
const types = ref([])

/** 筛选条件 */
const filters = ref({
  keyword: '',      // 关键词搜索
  department: '',   // 科室筛选
  status: '',       // 状态筛选
  type: ''          // 类型筛选
})

/** 分页配置 */
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

// ==================== 对话框状态 ====================

/** 新增/编辑对话框 */
const dialogVisible = ref(false)
const dialogTitle = ref('新增设备')
const isEdit = ref(false)
const formRef = ref(null)
const form = ref({})

/** 表单验证规则 */
const formRules = {
  code: [
    { required: true, message: '请输入设备编号', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9-]{5,19}$/, message: '编号格式：字母开头，6-20位', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }]
}

/** 详情对话框 */
const detailVisible = ref(false)
const currentRow = ref({})

/** 批量操作对话框 */
const batchDialogVisible = ref(false)
const batchField = ref('')
const batchValue = ref('')

/** 导入对话框 */
const showImportDialog = ref(false)
const importFileList = ref([])
const importPreview = ref([])
const importData = ref([])

/** 维护记录对话框 */
const maintenanceDialogVisible = ref(false)
const maintenanceRecords = ref([])
const maintenanceLoading = ref(false)

/** 二维码弹窗 */
const qrCodeDialogVisible = ref(false)
const qrCodeData = ref({})
const qrcodeImageRef = ref(null)
const qrcodeCanvasRef = ref(null)
const qrCodeLoading = ref(false)

// ==================== 图表引用 ====================

const completenessChartRef = ref(null)
const yearChartRef = ref(null)
let completenessChart = null
let yearChart = null

// ==================== 工具函数 ====================

/**
 * 根据设备状态返回对应的标签类型
 * @param {string} status - 设备状态
 * @returns {string} Element Plus标签类型
 */
const getStatusType = (status) => {
  const map = {
    '正常使用': 'success',
    '待维护': 'warning',
    '故障停机': 'danger',
    '待报废': 'info',
    '已报废': 'info'
  }
  return map[status] || 'info'
}

// ==================== 数据获取 ====================

/**
 * 获取设备列表数据
 * 支持分页和筛选
 */
const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.get('/equipment', {
      params: {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...filters.value
      }
    })
    tableData.value = res.list
    pagination.value.total = res.total
  } catch (e) {
    ElMessage.error('获取设备列表失败')
  }
  loading.value = false
}

/**
 * 获取下拉选项数据（科室、类型）
 */
const fetchOptions = async () => {
  try {
    const [depts, tps] = await Promise.all([
      api.get('/equipment/options/departments'),
      api.get('/equipment/options/types')
    ])
    departments.value = depts
    types.value = tps
  } catch (e) {
    console.error('获取选项失败:', e)
  }
}

/**
 * 获取图表数据并渲染
 * 包括台账完整率趋势和年限分布
 */
const fetchChartData = async () => {
  try {
    const data = await api.get('/dashboard/ledger-health')
    
    // 初始化完整率折线图
    completenessChart = echarts.init(completenessChartRef.value)
    completenessChart.setOption({
      tooltip: { trigger: 'axis', confine: true },
      grid: { left: 45, right: 15, top: 15, bottom: 25 },
      xAxis: {
        type: 'category',
        data: data.completenessHistory.map(i => i.month),
        axisLabel: { fontSize: 10 }
      },
      yAxis: { 
        type: 'value', 
        min: 90, 
        max: 100, 
        axisLabel: { formatter: '{value}%', fontSize: 10 } 
      },
      series: [{
        type: 'line',
        data: data.completenessHistory.map(i => i.rate),
        smooth: true,
        itemStyle: { color: '#0d9488' },
        areaStyle: { color: 'rgba(13, 148, 136, 0.1)' }
      }]
    })

    // 初始化年限分布饼图
    yearChart = echarts.init(yearChartRef.value)
    yearChart.setOption({
      tooltip: { trigger: 'item', confine: true },
      legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '42%'],
        data: data.byYear.map(i => ({
          name: i.year_range,
          value: i.count
        })),
        itemStyle: { borderRadius: 4 },
        label: { show: false }
      }]
    })
  } catch (e) {
    console.error('获取图表数据失败:', e)
  }
}

// ==================== 筛选操作 ====================

/** 重置筛选条件 */
const resetFilters = () => {
  filters.value = { keyword: '', department: '', status: '', type: '' }
  fetchList()
}

/** 处理表格选择变化 */
const handleSelectionChange = (rows) => {
  selectedIds.value = rows.map(r => r.id)
}

// ==================== CRUD操作 ====================

/** 打开新增对话框 */
const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增设备'
  form.value = {
    service_years: 5,
    maintenance_cycle: 30
  }
  dialogVisible.value = true
}

/** 打开编辑对话框 */
const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑设备'
  form.value = { ...row }
  dialogVisible.value = true
}

/** 查看设备详情 */
const handleView = (row) => {
  currentRow.value = row
  detailVisible.value = true
}

/** 查看设备维护记录 */
const handleViewMaintenance = async (row) => {
  currentRow.value = row
  maintenanceDialogVisible.value = true
  maintenanceLoading.value = true
  try {
    // 获取该设备的维护记录
    const data = await api.get('/maintenance', { params: { equipment_id: row.id } })
    maintenanceRecords.value = data || []
  } catch (e) {
    maintenanceRecords.value = []
  }
  maintenanceLoading.value = false
}

/** 获取维护类型标签颜色 */
const getMaintenanceTypeTag = (type) => {
  const map = { '日常维护': '', '校准': 'warning', '故障维修': 'danger' }
  return map[type] || ''
}

/** 跳转到维护管理页面 */
const goToMaintenance = () => {
  maintenanceDialogVisible.value = false
  router.push('/maintenance')
}

/** 删除设备 */
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该设备吗？此操作不可恢复。', '删除确认', {
    type: 'warning'
  }).then(async () => {
    await api.delete(`/equipment/${row.id}`)
    ElMessage.success('删除成功')
    fetchList()
  }).catch(() => {})
}

/** 提交表单（新增/编辑） */
const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (isEdit.value) {
      await api.put(`/equipment/${form.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      await api.post('/equipment', form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e) {
    // 错误已在api拦截器中处理
  }
}

// ==================== 批量操作 ====================

/** 显示批量操作对话框 */
const showBatchDialog = (field) => {
  batchField.value = field
  batchValue.value = field === 'status' ? '待报废' : ''
  batchDialogVisible.value = true
}

/** 执行批量更新 */
const handleBatchUpdate = async () => {
  if (!batchValue.value) {
    ElMessage.warning('请输入值')
    return
  }
  try {
    await api.post('/equipment/batch-update', {
      ids: selectedIds.value,
      field: batchField.value,
      value: batchValue.value
    })
    ElMessage.success('批量更新成功')
    batchDialogVisible.value = false
    fetchList()
  } catch (e) {
    ElMessage.error('批量更新失败')
  }
}

// ==================== 导出功能 ====================

/**
 * 导出设备数据为CSV文件
 * 包含当前筛选条件下的所有数据
 */
const handleExport = async () => {
  try {
    // CSV表头定义
    const headers = [
      '设备编号', '设备名称', '型号', '设备类型', '所属科室', 
      '采购日期', '使用年限', '当前状态', '维护周期', 
      '责任人', '供应商', '价格', '存放位置'
    ]
    
    // 转换数据行
    const rows = tableData.value.map(row => [
      row.code,
      row.name,
      row.model || '',
      row.type || '',
      row.department || '',
      row.purchase_date || '',
      row.service_years || '',
      row.status || '',
      row.maintenance_cycle || '',
      row.responsible_person || '',
      row.supplier || '',
      row.price || '',
      row.location || ''
    ])
    
    // 生成CSV内容（带BOM以支持中文）
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // 触发下载
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `设备台账_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

// ==================== 导入功能 ====================

/** 下载导入模板 */
const downloadTemplate = () => {
  const headers = [
    '设备编号', '设备名称', '型号', '设备类型', '所属科室', 
    '采购日期', '使用年限', '维护周期', '责任人', '供应商', '价格', '存放位置'
  ]
  const example = [
    'EQ000001', '心电监护仪', 'PM-9000', '监护设备', '心内科', 
    '2024-01-01', '5', '30', '张三', '迈瑞医疗', '50000', '1号楼3层'
  ]
  
  const csvContent = [headers, example]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '设备导入模板.csv'
  link.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('模板下载成功')
}

/**
 * 处理文件选择变化
 * 解析CSV文件并预览数据
 */
const handleFileChange = (file) => {
  importFileList.value = [file]
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        ElMessage.warning('文件内容为空或格式不正确')
        return
      }
      
      // 解析表头
      const headers = parseCSVLine(lines[0])
      const headerMap = {
        '设备编号': 'code',
        '设备名称': 'name',
        '型号': 'model',
        '设备类型': 'type',
        '所属科室': 'department',
        '采购日期': 'purchase_date',
        '使用年限': 'service_years',
        '维护周期': 'maintenance_cycle',
        '责任人': 'responsible_person',
        '供应商': 'supplier',
        '价格': 'price',
        '存放位置': 'location'
      }
      
      // 解析数据行
      const data = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row = {}
        headers.forEach((header, index) => {
          const key = headerMap[header.trim()]
          if (key) {
            row[key] = values[index]?.trim() || ''
          }
        })
        if (row.code && row.name) {
          data.push(row)
        }
      }
      
      importData.value = data
      importPreview.value = data.slice(0, 5)
      ElMessage.success(`解析成功，共${data.length}条数据`)
    } catch (err) {
      ElMessage.error('文件解析失败，请检查格式')
    }
  }
  reader.readAsText(file.raw, 'UTF-8')
}

/**
 * 解析CSV行（处理引号内的逗号）
 */
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

/**
 * 执行批量导入
 */
const handleImport = async () => {
  if (!importData.value.length) {
    ElMessage.warning('没有可导入的数据')
    return
  }
  
  let successCount = 0
  let failCount = 0
  
  for (const item of importData.value) {
    try {
      await api.post('/equipment', item)
      successCount++
    } catch (e) {
      failCount++
    }
  }
  
  ElMessage.success(`导入完成：成功${successCount}条，失败${failCount}条`)
  showImportDialog.value = false
  importFileList.value = []
  importPreview.value = []
  importData.value = []
  fetchList()
}

// ==================== 二维码功能 ====================

/**
 * 生成设备二维码
 */
const handleGenerateQRCode = async () => {
  qrCodeLoading.value = true
  try {
    const data = await api.get(`/equipment/${currentRow.value.id}/qrcode`)
    
    qrCodeData.value = {
      code: data.code || '-',
      name: data.name || '-',
      department: data.department || '-',
      responsible_person: data.responsible_person || '-',
      detail_url: `${window.location.origin}/equipment/${currentRow.value.id}`
    }
    
    qrCodeDialogVisible.value = true
  } catch (e) {
    ElMessage.error('生成二维码失败')
    qrCodeLoading.value = false
  }
}

/**
 * 对话框打开后渲染二维码
 */
const handleDialogOpened = async () => {
  await nextTick()
  
  if (!qrcodeCanvasRef.value || !qrCodeData.value.detail_url) {
    qrCodeLoading.value = false
    return
  }
  
  try {
    await QRCode.toCanvas(qrcodeCanvasRef.value, qrCodeData.value.detail_url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (e) {
    ElMessage.error('二维码渲染失败')
  } finally {
    qrCodeLoading.value = false
  }
}

/**
 * 下载二维码为PNG图片（包含设备信息文字）
 */
const handleDownloadQRCode = () => {
  if (!qrcodeCanvasRef.value) return
  
  const originalCanvas = qrcodeCanvasRef.value
  const labelCanvas = document.createElement('canvas')
  const ctx = labelCanvas.getContext('2d')
  
  const qrSize = 200
  const padding = 20
  const textHeight = 80
  const totalWidth = qrSize + padding * 2
  const totalHeight = qrSize + textHeight + padding * 3
  
  labelCanvas.width = totalWidth
  labelCanvas.height = totalHeight
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalWidth, totalHeight)
  
  ctx.drawImage(originalCanvas, padding, padding, qrSize, qrSize)
  
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  
  const textStartY = qrSize + padding * 2
  const lineHeight = 20
  
  ctx.fillText(`设备编号: ${qrCodeData.value.code}`, totalWidth / 2, textStartY)
  ctx.fillText(`设备名称: ${qrCodeData.value.name}`, totalWidth / 2, textStartY + lineHeight)
  ctx.fillText(`科室: ${qrCodeData.value.department}`, totalWidth / 2, textStartY + lineHeight * 2)
  ctx.fillText(`责任人: ${qrCodeData.value.responsible_person}`, totalWidth / 2, textStartY + lineHeight * 3)
  
  const link = document.createElement('a')
  link.download = `${qrCodeData.value.code}_设备标签.png`
  link.href = labelCanvas.toDataURL('image/png')
  link.click()
  
  ElMessage.success('二维码标签下载成功')
}

// ==================== 生命周期 ====================

/** 窗口大小变化时重绘图表 */
const handleResize = () => {
  completenessChart?.resize()
  yearChart?.resize()
}

onMounted(() => {
  fetchList()
  fetchOptions()
  fetchChartData()
  window.addEventListener('resize', handleResize)
  setTimeout(handleResize, 200)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  completenessChart?.dispose()
  yearChart?.dispose()
})
</script>

<style scoped>
/* 内容区域布局 */
.content-wrapper {
  display: flex;
  gap: 20px;
  height: calc(100% - 70px);
}

/* 表格区域 */
.table-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 图表区域 */
.chart-section {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}

/* 批量操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

/* 表格卡片 */
.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 分页容器 */
.pagination-wrapper {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 图表区域样式 */
.chart-section .medical-card {
  flex: 1;
  min-height: 0;
}

.chart-section h3 {
  font-size: 14px;
  margin-bottom: 10px;
}

.chart-section .chart-container {
  height: calc(100% - 35px);
  min-height: 180px;
}

/* 导入提示 */
.import-tips {
  margin-bottom: 20px;
  padding: 12px;
  background: var(--medical-bg);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
}

/* 导入预览 */
.import-preview {
  margin-top: 16px;
}

.import-preview h4 {
  font-size: 14px;
  margin-bottom: 8px;
}

/* 维护记录样式 */
.maintenance-records {
  max-height: 400px;
  overflow-y: auto;
}

.maintenance-records .record-card {
  background: var(--medical-bg);
  padding: 12px;
  border-radius: 8px;
}

.maintenance-records .record-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.maintenance-records .record-info {
  font-size: 13px;
  color: var(--medical-text-secondary);
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}

.maintenance-records .record-desc,
.maintenance-records .record-result {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-top: 6px;
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  gap: 12px;
}

/* 二维码容器样式 */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.qrcode-info {
  width: 100%;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--medical-bg);
  border-radius: 8px;
}

.qrcode-info p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--medical-text);
}

.qrcode-image {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.qrcode-image canvas {
  display: block;
}
</style>
