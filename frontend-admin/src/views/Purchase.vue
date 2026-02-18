<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">采购管理</h1>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增采购申请
      </el-button>
    </div>

    <!-- 采购申请卡片流 -->
    <div class="purchase-section">
      <el-tabs v-model="activeTab" @tab-change="fetchList">
        <el-tab-pane label="待审批" name="待审批">
          <div class="card-grid" v-loading="loading">
            <div class="purchase-card" v-for="item in list" :key="item.id">
              <div class="card-header">
                <span class="request-no">{{ item.request_no }}</span>
                <el-tag type="warning" size="small">待审批</el-tag>
              </div>
              <div class="card-body">
                <h3>{{ item.equipment_name }}</h3>
                <div class="info-row">
                  <span>型号：{{ item.model || '-' }}</span>
                  <span>数量：{{ item.quantity }}</span>
                </div>
                <div class="info-row">
                  <span>申请科室：{{ item.department }}</span>
                </div>
                <div class="info-row">
                  <span>预算：¥{{ item.budget?.toLocaleString() }}</span>
                </div>
                <div class="info-row">
                  <span>申请人：{{ item.applicant }}</span>
                </div>
                <div class="info-row time">
                  <el-icon><Clock /></el-icon>
                  {{ formatDate(item.created_at) }}
                </div>
              </div>
              <div class="card-footer">
                <el-button size="small" @click="handleView(item)">查看详情</el-button>
                <el-button size="small" type="success" @click="handleApprove(item, true)">通过</el-button>
                <el-button size="small" type="danger" @click="handleApprove(item, false)">驳回</el-button>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无数据" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="已审批" name="已审批">
          <div class="card-grid" v-loading="loading">
            <div class="purchase-card" v-for="item in list" :key="item.id">
              <div class="card-header">
                <span class="request-no">{{ item.request_no }}</span>
                <el-tag type="success" size="small">已审批</el-tag>
              </div>
              <div class="card-body">
                <h3>{{ item.equipment_name }}</h3>
                <div class="info-row">
                  <span>型号：{{ item.model || '-' }}</span>
                  <span>数量：{{ item.quantity }}</span>
                </div>
                <div class="info-row">
                  <span>申请科室：{{ item.department }}</span>
                </div>
                <div class="info-row">
                  <span>审批人：{{ item.approver }}</span>
                </div>
              </div>
              <div class="card-footer">
                <el-button size="small" @click="handleView(item)">查看详情</el-button>
                <el-button size="small" type="primary" @click="handleStore(item)">标记入库</el-button>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无数据" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="已入库" name="已入库">
          <div class="card-grid" v-loading="loading">
            <div class="purchase-card" v-for="item in list" :key="item.id">
              <div class="card-header">
                <span class="request-no">{{ item.request_no }}</span>
                <el-tag type="info" size="small">已入库</el-tag>
              </div>
              <div class="card-body">
                <h3>{{ item.equipment_name }}</h3>
                <div class="info-row">
                  <span>型号：{{ item.model || '-' }}</span>
                  <span>数量：{{ item.quantity }}</span>
                </div>
                <div class="info-row">
                  <span>入库时间：{{ formatDate(item.stored_at) }}</span>
                </div>
              </div>
              <div class="card-footer">
                <el-button size="small" @click="handleView(item)">查看详情</el-button>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无数据" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="已驳回" name="已驳回">
          <div class="card-grid" v-loading="loading">
            <div class="purchase-card rejected" v-for="item in list" :key="item.id">
              <div class="card-header">
                <span class="request-no">{{ item.request_no }}</span>
                <el-tag type="danger" size="small">已驳回</el-tag>
              </div>
              <div class="card-body">
                <h3>{{ item.equipment_name }}</h3>
                <div class="info-row">
                  <span>驳回原因：{{ item.reject_reason || '-' }}</span>
                </div>
              </div>
              <div class="card-footer">
                <el-button size="small" @click="handleView(item)">查看详情</el-button>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无数据" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 采购趋势分析 -->
    <div class="grid-container grid-2 chart-section">
      <div class="medical-card">
        <h3>采购趋势分析</h3>
        <div class="chart-container" ref="trendChartRef"></div>
      </div>
      <div class="medical-card">
        <h3>采购流程转化率</h3>
        <div class="chart-container" ref="funnelChartRef"></div>
      </div>
    </div>

    <!-- 供应商关联卡片 -->
    <div class="medical-card supplier-section">
      <h3>核心供应商</h3>
      <div class="supplier-cards">
        <div class="supplier-card" v-for="s in suppliers" :key="s.id">
          <div class="supplier-name">{{ s.name }}</div>
          <div class="supplier-info">
            <span>合作设备：{{ s.equipment_types }}</span>
          </div>
          <div class="supplier-info">
            <span>采购金额：¥{{ (s.total_amount / 10000).toFixed(1) }}万</span>
          </div>
          <div class="supplier-rating">
            <el-rate v-model="s.rating" disabled />
          </div>
          <el-button size="small" link type="primary" @click="viewSupplierRecords(s)">查看采购记录</el-button>
        </div>
      </div>
    </div>

    <!-- 新增采购申请对话框 -->
    <el-dialog v-model="dialogVisible" title="新增采购申请" width="500px">
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="设备名称" prop="equipment_name">
          <el-input v-model="form.equipment_name" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="form.model" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="检验设备" value="检验设备" />
            <el-option label="影像设备" value="影像设备" />
            <el-option label="急救设备" value="急救设备" />
            <el-option label="康复设备" value="康复设备" />
            <el-option label="监护设备" value="监护设备" />
            <el-option label="手术设备" value="手术设备" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请科室" prop="department">
          <el-input v-model="form.department" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="预算(元)" prop="budget">
          <el-input-number v-model="form.budget" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input v-model="form.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="采购申请详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请单号">{{ currentRow.request_no }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ currentRow.equipment_name }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ currentRow.model || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ currentRow.type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请科室">{{ currentRow.department }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ currentRow.quantity }}</el-descriptions-item>
        <el-descriptions-item label="预算">¥{{ currentRow.budget?.toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="申请原因">{{ currentRow.reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicant }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDate(currentRow.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentRow.status)">{{ currentRow.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审批人" v-if="currentRow.approver">{{ currentRow.approver }}</el-descriptions-item>
        <el-descriptions-item label="驳回原因" v-if="currentRow.reject_reason">{{ currentRow.reject_reason }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 驳回原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 供应商采购记录对话框 -->
    <el-dialog v-model="supplierRecordsVisible" :title="`${currentSupplier.name} - 采购记录`" width="700px">
      <div class="supplier-detail">
        <div class="supplier-info-header">
          <div class="info-item">
            <span class="label">合作设备类型：</span>
            <span>{{ currentSupplier.equipment_types }}</span>
          </div>
          <div class="info-item">
            <span class="label">累计采购金额：</span>
            <span class="amount">¥{{ (currentSupplier.total_amount / 10000).toFixed(1) }}万</span>
          </div>
          <div class="info-item">
            <span class="label">履约评分：</span>
            <el-rate v-model="currentSupplier.rating" disabled />
          </div>
        </div>
        <el-divider />
        <h4>采购记录</h4>
        <div class="records-list" v-loading="recordsLoading">
          <div class="record-card" v-for="record in supplierRecords" :key="record.id">
            <div class="record-header">
              <span class="record-no">{{ record.request_no }}</span>
              <el-tag :type="getStatusType(record.status)" size="small">{{ record.status }}</el-tag>
            </div>
            <div class="record-body">
              <div class="record-name">{{ record.equipment_name }}</div>
              <div class="record-info">
                <span>数量：{{ record.quantity }}</span>
                <span>金额：¥{{ record.budget?.toLocaleString() }}</span>
                <span>{{ formatDate(record.created_at) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="!recordsLoading && !supplierRecords.length" description="暂无采购记录" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import api from '../utils/api'

const loading = ref(false)
const activeTab = ref('待审批')
const list = ref([])
const suppliers = ref([])

const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref({ quantity: 1 })
const formRules = {
  equipment_name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  department: [{ required: true, message: '请输入申请科室', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  budget: [{ required: true, message: '请输入预算', trigger: 'blur' }]
}

const detailVisible = ref(false)
const currentRow = ref({})

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingItem = ref(null)

const supplierRecordsVisible = ref(false)
const currentSupplier = ref({})
const supplierRecords = ref([])
const recordsLoading = ref(false)

const trendChartRef = ref(null)
const funnelChartRef = ref(null)
let trendChart = null
let funnelChart = null

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const getStatusType = (status) => {
  const map = { '待审批': 'warning', '已审批': 'success', '已入库': 'info', '已驳回': 'danger' }
  return map[status] || 'info'
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await api.get('/purchase', { params: { status: activeTab.value } })
    list.value = data
  } catch (e) {}
  loading.value = false
}

const fetchSuppliers = async () => {
  try {
    const data = await api.get('/purchase/suppliers/list')
    suppliers.value = data
  } catch (e) {}
}

const fetchStats = async () => {
  try {
    const data = await api.get('/purchase/stats/overview')
    
    // 趋势图
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: { trigger: 'axis', confine: true },
      legend: { data: ['采购金额', '采购数量'], bottom: 0, itemGap: 12, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 40, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.monthlyTrend.map(i => i.month), axisLabel: { fontSize: 11 } },
      yAxis: [
        { type: 'value', name: '金额(万)', axisLabel: { formatter: v => (v / 10000).toFixed(0), fontSize: 11 }, nameTextStyle: { fontSize: 11 } },
        { type: 'value', name: '数量', axisLabel: { fontSize: 11 }, nameTextStyle: { fontSize: 11 } }
      ],
      series: [
        {
          name: '采购金额',
          type: 'bar',
          data: data.monthlyTrend.map(i => i.amount || 0),
          itemStyle: { color: '#0d9488' }
        },
        {
          name: '采购数量',
          type: 'line',
          yAxisIndex: 1,
          data: data.monthlyTrend.map(i => i.count),
          itemStyle: { color: '#f59e0b' }
        }
      ]
    })

    // 漏斗图
    funnelChart = echarts.init(funnelChartRef.value)
    funnelChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}', confine: true },
      series: [{
        type: 'funnel',
        left: '10%',
        width: '80%',
        top: 20,
        bottom: 20,
        min: 0,
        max: data.funnel.total || 100,
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside', fontSize: 12 },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        data: [
          { value: data.funnel.total, name: '申请', itemStyle: { color: '#3b82f6' } },
          { value: data.funnel.approved, name: '审批通过', itemStyle: { color: '#0d9488' } },
          { value: data.funnel.stored, name: '已入库', itemStyle: { color: '#10b981' } }
        ]
      }]
    })
  } catch (e) {}
}

const handleAdd = () => {
  form.value = { quantity: 1 }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/purchase', form.value)
    ElMessage.success('采购申请提交成功')
    dialogVisible.value = false
    fetchList()
  } catch (e) {}
}

const handleView = (item) => {
  currentRow.value = item
  detailVisible.value = true
}

const handleApprove = async (item, approved) => {
  if (approved) {
    ElMessageBox.confirm('确定通过该采购申请吗？', '提示').then(async () => {
      await api.post(`/purchase/${item.id}/approve`, { approved: true })
      ElMessage.success('审批通过')
      fetchList()
    })
  } else {
    rejectingItem.value = item
    rejectReason.value = ''
    rejectDialogVisible.value = true
  }
}

const confirmReject = async () => {
  await api.post(`/purchase/${rejectingItem.value.id}/approve`, {
    approved: false,
    reject_reason: rejectReason.value
  })
  ElMessage.success('已驳回')
  rejectDialogVisible.value = false
  fetchList()
}

const handleStore = async (item) => {
  ElMessageBox.confirm('确定标记该采购为已入库吗？', '提示').then(async () => {
    await api.post(`/purchase/${item.id}/store`)
    ElMessage.success('已标记入库')
    fetchList()
  })
}

const viewSupplierRecords = async (supplier) => {
  currentSupplier.value = supplier
  supplierRecordsVisible.value = true
  recordsLoading.value = true
  try {
    const data = await api.get(`/purchase/suppliers/${supplier.id}/records`)
    supplierRecords.value = data.records || []
  } catch (e) {
    supplierRecords.value = []
  }
  recordsLoading.value = false
}

const handleResize = () => {
  trendChart?.resize()
  funnelChart?.resize()
}

onMounted(() => {
  fetchList()
  fetchSuppliers()
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  funnelChart?.dispose()
})
</script>

<style scoped>
.purchase-section {
  margin-bottom: 20px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.purchase-card {
  background: white;
  border-radius: 12px;
  box-shadow: var(--medical-card-shadow);
  overflow: hidden;
  border-left: 4px solid var(--medical-primary);
}

.purchase-card.rejected {
  border-left-color: var(--medical-danger);
}

.purchase-card .card-header {
  padding: 12px 16px;
  background: var(--medical-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.purchase-card .request-no {
  font-weight: 600;
  color: var(--medical-text);
}

.purchase-card .card-body {
  padding: 16px;
}

.purchase-card h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.purchase-card .info-row {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-bottom: 6px;
  display: flex;
  gap: 16px;
}

.purchase-card .info-row.time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  color: var(--medical-text-secondary);
}

.purchase-card .card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--medical-border);
  display: flex;
  gap: 8px;
}

.chart-section {
  margin-bottom: 20px;
}

.chart-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.chart-section .chart-container {
  height: 240px;
}

.supplier-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.supplier-cards {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.supplier-card {
  min-width: 220px;
  padding: 16px;
  background: var(--medical-bg);
  border-radius: 10px;
}

.supplier-card .supplier-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}

.supplier-card .supplier-info {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-bottom: 6px;
}

.supplier-card .supplier-rating {
  margin: 10px 0;
}

.supplier-detail .supplier-info-header {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.supplier-detail .info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.supplier-detail .info-item .label {
  color: var(--medical-text-secondary);
}

.supplier-detail .info-item .amount {
  font-weight: 600;
  color: var(--medical-primary);
}

.supplier-detail h4 {
  font-size: 15px;
  margin-bottom: 12px;
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  background: var(--medical-bg);
  border-radius: 8px;
  padding: 12px 16px;
}

.record-card .record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-card .record-no {
  font-size: 12px;
  color: var(--medical-text-secondary);
}

.record-card .record-name {
  font-weight: 600;
  margin-bottom: 6px;
}

.record-card .record-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--medical-text-secondary);
}
</style>
