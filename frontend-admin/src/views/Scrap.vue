<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">报废管理</h1>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增报废申请
      </el-button>
    </div>

    <div class="content-grid">
      <!-- 左侧：图表区域 -->
      <div class="chart-area">
        <div class="grid-container grid-2">
          <!-- 报废状态分布 -->
          <div class="medical-card">
            <h3>报废状态分布</h3>
            <div class="chart-container" ref="statusChartRef"></div>
          </div>

          <!-- 各科室报废数量 -->
          <div class="medical-card">
            <h3>各科室报废数量排名</h3>
            <div class="chart-container" ref="deptChartRef"></div>
          </div>
        </div>

        <!-- 报废趋势 + 年限分析 -->
        <div class="grid-container grid-2">
          <div class="medical-card">
            <h3>近6个月报废趋势</h3>
            <div class="chart-container" ref="trendChartRef"></div>
          </div>
          <div class="medical-card">
            <h3>报废合理性分析（按使用年限）</h3>
            <div class="chart-container" ref="yearAnalysisChartRef"></div>
          </div>
        </div>
      </div>

      <!-- 右侧：报废申请流程卡片 -->
      <div class="card-area">
        <div class="medical-card">
          <div class="section-header">
            <h3>报废申请</h3>
            <el-select v-model="statusFilter" placeholder="筛选状态" clearable size="small" style="width: 160px" @change="fetchList">
              <el-option label="待审核" value="待审核" />
              <el-option label="审核通过待处置" value="审核通过待处置" />
              <el-option label="已报废" value="已报废" />
              <el-option label="报废驳回" value="报废驳回" />
            </el-select>
          </div>

          <div class="scrap-list" v-loading="loading">
            <div 
              class="scrap-card"
              v-for="item in list" 
              :key="item.id"
              :class="getCardClass(item.status)"
            >
              <div class="card-header">
                <span class="equipment-code">{{ item.equipment_code }}</span>
                <el-tag :type="getStatusType(item.status)" size="small">{{ item.status }}</el-tag>
              </div>
              <div class="card-body">
                <h4>{{ item.equipment_name }}</h4>
                <div class="info-row">
                  <el-icon><Warning /></el-icon>
                  <span>报废原因：{{ item.reason }}</span>
                </div>
                <div class="info-row">
                  <el-icon><Money /></el-icon>
                  <span>评估金额：¥{{ item.assessed_value?.toLocaleString() }}</span>
                </div>
                <div class="info-row">
                  <el-icon><User /></el-icon>
                  <span>申请人：{{ item.applicant }}</span>
                </div>
                <div class="info-row time">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <div class="info-row" v-if="item.disposal_method">
                  <el-icon><Check /></el-icon>
                  <span>处置方式：{{ item.disposal_method }}</span>
                </div>
                <div class="info-row reject" v-if="item.reject_reason">
                  <el-icon><Close /></el-icon>
                  <span>驳回原因：{{ item.reject_reason }}</span>
                </div>
              </div>
              <div class="card-footer">
                <el-button size="small" @click="handleView(item)">查看详情</el-button>
                <el-button 
                  size="small" 
                  type="success" 
                  v-if="item.status === '待审核'"
                  @click="handleApprove(item, true)"
                >
                  审核通过
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  v-if="item.status === '待审核'"
                  @click="handleApprove(item, false)"
                >
                  驳回
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  v-if="item.status === '审核通过待处置'"
                  @click="handleDispose(item)"
                >
                  标记处置
                </el-button>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无数据" />
          </div>
        </div>
      </div>
    </div>

    <!-- 新增报废申请对话框 -->
    <el-dialog v-model="dialogVisible" title="新增报废申请" width="500px">
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="设备编号" prop="equipment_code">
          <el-input v-model="form.equipment_code" />
        </el-form-item>
        <el-form-item label="设备名称" prop="equipment_name">
          <el-input v-model="form.equipment_name" />
        </el-form-item>
        <el-form-item label="报废原因" prop="reason">
          <el-select v-model="form.reason" style="width: 100%">
            <el-option label="老化" value="老化" />
            <el-option label="故障无法修复" value="故障无法修复" />
            <el-option label="技术淘汰" value="技术淘汰" />
          </el-select>
        </el-form-item>
        <el-form-item label="评估金额" prop="assessed_value">
          <el-input-number v-model="form.assessed_value" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="报废申请详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="设备编号">{{ currentRow.equipment_code }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ currentRow.equipment_name }}</el-descriptions-item>
        <el-descriptions-item label="报废原因">{{ currentRow.reason }}</el-descriptions-item>
        <el-descriptions-item label="评估金额">¥{{ currentRow.assessed_value?.toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicant }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDate(currentRow.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentRow.status)">{{ currentRow.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核人" v-if="currentRow.approver">{{ currentRow.approver }}</el-descriptions-item>
        <el-descriptions-item label="审核时间" v-if="currentRow.approved_at">{{ formatDate(currentRow.approved_at) }}</el-descriptions-item>
        <el-descriptions-item label="处置方式" v-if="currentRow.disposal_method">{{ currentRow.disposal_method }}</el-descriptions-item>
        <el-descriptions-item label="处置时间" v-if="currentRow.disposed_at">{{ formatDate(currentRow.disposed_at) }}</el-descriptions-item>
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

    <!-- 处置方式对话框 -->
    <el-dialog v-model="disposeDialogVisible" title="选择处置方式" width="400px">
      <el-form label-width="100px">
        <el-form-item label="处置方式">
          <el-select v-model="disposalMethod" style="width: 100%">
            <el-option label="变卖" value="变卖" />
            <el-option label="拆解" value="拆解" />
            <el-option label="回收" value="回收" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDispose">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import api from '../utils/api'

const loading = ref(false)
const statusFilter = ref('')
const list = ref([])

const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref({})
const formRules = {
  equipment_code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  equipment_name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  reason: [{ required: true, message: '请选择报废原因', trigger: 'change' }],
  assessed_value: [{ required: true, message: '请输入评估金额', trigger: 'blur' }]
}

const detailVisible = ref(false)
const currentRow = ref({})

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingItem = ref(null)

const disposeDialogVisible = ref(false)
const disposalMethod = ref('')
const disposingItem = ref(null)

const statusChartRef = ref(null)
const deptChartRef = ref(null)
const trendChartRef = ref(null)
const yearAnalysisChartRef = ref(null)
let statusChart = null
let deptChart = null
let trendChart = null
let yearAnalysisChart = null

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const getStatusType = (status) => {
  const map = {
    '待审核': 'warning',
    '审核通过待处置': 'primary',
    '已报废': 'info',
    '报废驳回': 'danger'
  }
  return map[status] || 'info'
}

const getCardClass = (status) => {
  const map = {
    '待审核': 'pending',
    '审核通过待处置': 'approved',
    '已报废': 'disposed',
    '报废驳回': 'rejected'
  }
  return map[status] || ''
}

const fetchList = async () => {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    const data = await api.get('/scrap', { params })
    list.value = data
  } catch (e) {}
  loading.value = false
}

const fetchStats = async () => {
  try {
    const data = await api.get('/scrap/stats/overview')

    // 状态分布环形图
    if (data.byStatus?.length) {
      const statusColors = {
        '待审核': '#f59e0b',
        '审核通过待处置': '#3b82f6',
        '已报废': '#6b7280',
        '报废驳回': '#ef4444'
      }
      statusChart = echarts.init(statusChartRef.value)
      statusChart.setOption({
        tooltip: { trigger: 'item', confine: true },
        legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['35%', '50%'],
          data: data.byStatus.map(s => ({
            name: s.status,
            value: s.count,
            itemStyle: { color: statusColors[s.status] }
          })),
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false }
        }]
      })
    }

    // 科室排名条形图
    if (data.byDepartment?.length) {
      deptChart = echarts.init(deptChartRef.value)
      deptChart.setOption({
        tooltip: { trigger: 'axis', confine: true },
        grid: { left: 80, right: 20, top: 10, bottom: 10 },
        xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        yAxis: {
          type: 'category',
          data: data.byDepartment.map(d => d.department || '未分配').reverse(),
          axisLabel: { fontSize: 11 }
        },
        series: [{
          type: 'bar',
          data: data.byDepartment.map(d => d.count).reverse(),
          itemStyle: { color: '#0d9488', borderRadius: [0, 4, 4, 0] }
        }]
      })
    }

    // 趋势折线图
    if (data.monthlyTrend?.length) {
      trendChart = echarts.init(trendChartRef.value)
      trendChart.setOption({
        tooltip: { trigger: 'axis', confine: true },
        legend: { data: ['报废数量', '报废金额'], bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: 50, right: 50, top: 10, bottom: 50 },
        xAxis: { type: 'category', data: data.monthlyTrend.map(t => t.month), axisLabel: { fontSize: 11 } },
        yAxis: [
          { type: 'value', name: '数量', axisLabel: { fontSize: 11 }, nameTextStyle: { fontSize: 11 } },
          { type: 'value', name: '金额(万)', axisLabel: { formatter: v => (v / 10000).toFixed(0), fontSize: 11 }, nameTextStyle: { fontSize: 11 } }
        ],
        series: [
          {
            name: '报废数量',
            type: 'bar',
            data: data.monthlyTrend.map(t => t.count),
            itemStyle: { color: '#0d9488' }
          },
          {
            name: '报废金额',
            type: 'line',
            yAxisIndex: 1,
            data: data.monthlyTrend.map(t => t.amount || 0),
            itemStyle: { color: '#f59e0b' }
          }
        ]
      })
    }

    // 报废合理性分析（按使用年限）
    yearAnalysisChart = echarts.init(yearAnalysisChartRef.value)
    // 模拟数据：按使用年限分布的报废设备
    const yearData = [
      { range: '0-3年', count: 2, reasonable: false },
      { range: '3-5年', count: 5, reasonable: false },
      { range: '5-8年', count: 12, reasonable: true },
      { range: '8-10年', count: 18, reasonable: true },
      { range: '>10年', count: 8, reasonable: true }
    ]
    yearAnalysisChart.setOption({
      tooltip: { 
        trigger: 'axis', 
        confine: true,
        formatter: params => {
          const d = yearData[params[0].dataIndex]
          return `${d.range}<br/>报废数量: ${d.count}<br/>合理性: ${d.reasonable ? '✓ 合理' : '⚠ 需审核'}`
        }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { 
        type: 'category', 
        data: yearData.map(d => d.range),
        axisLabel: { fontSize: 11 }
      },
      yAxis: { type: 'value', name: '数量', axisLabel: { fontSize: 11 }, nameTextStyle: { fontSize: 11 } },
      series: [{
        type: 'bar',
        data: yearData.map(d => ({
          value: d.count,
          itemStyle: { 
            color: d.reasonable ? '#10b981' : '#f59e0b',
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: params => yearData[params.dataIndex].reasonable ? '' : '⚠',
          fontSize: 14
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', type: 'dashed' },
          data: [{ xAxis: 1.5, label: { formatter: '合理报废线', fontSize: 10 } }]
        }
      }]
    })
  } catch (e) {}
}

const handleAdd = () => {
  form.value = {}
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/scrap', form.value)
    ElMessage.success('报废申请提交成功')
    dialogVisible.value = false
    fetchList()
    fetchStats()
  } catch (e) {}
}

const handleView = (item) => {
  currentRow.value = item
  detailVisible.value = true
}

const handleApprove = async (item, approved) => {
  if (approved) {
    ElMessageBox.confirm('确定审核通过该报废申请吗？', '提示').then(async () => {
      await api.post(`/scrap/${item.id}/approve`, { approved: true })
      ElMessage.success('审核通过')
      fetchList()
      fetchStats()
    })
  } else {
    rejectingItem.value = item
    rejectReason.value = ''
    rejectDialogVisible.value = true
  }
}

const confirmReject = async () => {
  await api.post(`/scrap/${rejectingItem.value.id}/approve`, {
    approved: false,
    reject_reason: rejectReason.value
  })
  ElMessage.success('已驳回')
  rejectDialogVisible.value = false
  fetchList()
  fetchStats()
}

const handleDispose = (item) => {
  disposingItem.value = item
  disposalMethod.value = ''
  disposeDialogVisible.value = true
}

const confirmDispose = async () => {
  if (!disposalMethod.value) {
    ElMessage.warning('请选择处置方式')
    return
  }
  await api.post(`/scrap/${disposingItem.value.id}/dispose`, {
    disposal_method: disposalMethod.value
  })
  ElMessage.success('处置完成')
  disposeDialogVisible.value = false
  fetchList()
  fetchStats()
}

const handleResize = () => {
  statusChart?.resize()
  deptChart?.resize()
  trendChart?.resize()
  yearAnalysisChart?.resize()
}

onMounted(() => {
  fetchList()
  fetchStats()
  window.addEventListener('resize', handleResize)
  setTimeout(handleResize, 200)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  statusChart?.dispose()
  deptChart?.dispose()
  trendChart?.dispose()
  yearAnalysisChart?.dispose()
})
</script>

<style scoped>
.content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  height: calc(100% - 70px);
}

.chart-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.chart-area h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.chart-container {
  height: 200px;
}

.chart-area > .medical-card .chart-container {
  height: 180px;
}

.chart-area > .grid-container .chart-container {
  height: 180px;
}

.card-area {
  overflow-y: auto;
}

.card-area .medical-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.section-header h3 {
  font-size: 16px;
  white-space: nowrap;
}

.scrap-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scrap-card {
  background: white;
  border-radius: 10px;
  border-left: 4px solid var(--medical-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.scrap-card.pending {
  border-left-color: #f59e0b;
}

.scrap-card.approved {
  border-left-color: #3b82f6;
}

.scrap-card.disposed {
  border-left-color: #6b7280;
}

.scrap-card.rejected {
  border-left-color: #ef4444;
}

.scrap-card .card-header {
  padding: 12px 16px;
  background: var(--medical-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px 10px 0 0;
}

.scrap-card .equipment-code {
  font-weight: 600;
  font-size: 13px;
}

.scrap-card .card-body {
  padding: 16px;
}

.scrap-card h4 {
  font-size: 15px;
  margin-bottom: 12px;
}

.scrap-card .info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-bottom: 6px;
}

.scrap-card .info-row.time {
  margin-top: 10px;
}

.scrap-card .info-row.reject {
  color: var(--medical-danger);
}

.scrap-card .card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--medical-border);
  display: flex;
  gap: 8px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .card-area {
    max-height: 500px;
  }
}
</style>
