<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">维护管理</h1>
      <el-button type="primary" @click="handleAddMaintenance">
        <el-icon><Plus /></el-icon>
        新增维护任务
      </el-button>
    </div>

    <div class="content-grid">
      <!-- 左侧：日历视图 + 维护完成率 -->
      <div class="left-section">
        <!-- 维护计划日历 -->
        <div class="medical-card calendar-card">
          <h3>维护计划日历</h3>
          <el-calendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div class="calendar-cell" @click="handleDateClick(data.day)">
                <span class="day-num">{{ data.day.split('-')[2] }}</span>
                <div class="task-dots" v-if="getTaskCount(data.day)">
                  <span class="dot" :class="{ 'has-task': getTaskCount(data.day) > 0 }"></span>
                  <span class="count">{{ getTaskCount(data.day) }}</span>
                </div>
              </div>
            </template>
          </el-calendar>
        </div>

        <!-- 维护完成率图表 -->
        <div class="medical-card">
          <h3>各科室维护完成情况</h3>
          <div class="chart-container" ref="deptChartRef" v-show="hasDeptData"></div>
          <el-empty v-show="!hasDeptData" description="暂无维护数据" :image-size="100" />
        </div>
      </div>

      <!-- 右侧：故障报修看板 -->
      <div class="right-section">
        <div class="medical-card fault-section">
          <div class="section-header">
            <h3>故障报修看板</h3>
            <div class="filter-area">
              <el-select v-model="faultFilter" placeholder="故障类型" clearable size="small" style="width: 120px" @change="fetchFaults">
                <el-option label="硬件" value="硬件" />
                <el-option label="软件" value="软件" />
                <el-option label="操作失误" value="操作失误" />
              </el-select>
              <el-button type="primary" size="small" @click="handleAddFault">
                <el-icon><Plus /></el-icon>
                报修
              </el-button>
            </div>
          </div>

          <!-- 故障类型占比 -->
          <div class="fault-stats">
            <div class="chart-mini" ref="faultPieRef"></div>
          </div>

          <!-- 看板 -->
          <div class="kanban-container">
            <div class="kanban-column" v-for="status in faultStatuses" :key="status">
              <div class="column-header">
                <span>{{ status }}</span>
                <span class="count">{{ getFaultsByStatus(status).length }}</span>
              </div>
              <div class="kanban-cards">
                <div class="fault-card" v-for="fault in getFaultsByStatus(status)" :key="fault.id">
                  <div class="fault-header">
                    <span class="report-no">{{ fault.report_no }}</span>
                    <el-tag :type="getFaultTypeColor(fault.fault_type)" size="small">{{ fault.fault_type }}</el-tag>
                  </div>
                  <div class="fault-name">{{ fault.equipment_name }}</div>
                  <div class="fault-desc">{{ fault.description }}</div>
                  <div class="fault-info">
                    <span>报修人：{{ fault.reporter }}</span>
                    <span>{{ formatDate(fault.created_at) }}</span>
                  </div>
                  <div class="fault-actions">
                    <el-button size="small" v-if="status === '待派单'" @click="handleDispatch(fault)">派单</el-button>
                    <el-button size="small" v-if="status === '维修中'" @click="handleComplete(fault)">完成</el-button>
                    <el-button size="small" v-if="status === '已完成'" @click="handleClose(fault)">关闭</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日期任务弹窗 -->
    <el-dialog v-model="taskDialogVisible" :title="`${selectedDate} 维护任务`" width="500px">
      <div class="task-list">
        <div class="task-item" v-for="task in dayTasks" :key="task.id">
          <div class="task-info">
            <div class="task-name">{{ task.equipment_name }}</div>
            <div class="task-meta">
              <el-tag :type="getMaintenanceTypeColor(task.type)" size="small">{{ task.type }}</el-tag>
              <span>{{ task.responsible_person }}</span>
            </div>
          </div>
          <div class="task-status">
            <el-tag :type="task.status === '已完成' ? 'success' : 'warning'" size="small">{{ task.status }}</el-tag>
          </div>
          <div class="task-actions" v-if="task.status !== '已完成'">
            <el-button size="small" type="primary" @click="handleCompleteTask(task)">完成</el-button>
          </div>
        </div>
        <el-empty v-if="!dayTasks.length" description="当日无维护任务" />
      </div>
    </el-dialog>

    <!-- 新增维护任务对话框 -->
    <el-dialog v-model="maintenanceDialogVisible" title="新增维护任务" width="500px">
      <el-form :model="maintenanceForm" label-width="100px" :rules="maintenanceRules" ref="maintenanceFormRef">
        <el-form-item label="设备名称" prop="equipment_name">
          <el-input v-model="maintenanceForm.equipment_name" />
        </el-form-item>
        <el-form-item label="维护类型" prop="type">
          <el-select v-model="maintenanceForm.type" style="width: 100%">
            <el-option label="日常维护" value="日常维护" />
            <el-option label="校准" value="校准" />
            <el-option label="故障维修" value="故障维修" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期" prop="scheduled_date">
          <el-date-picker v-model="maintenanceForm.scheduled_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="负责人" prop="responsible_person">
          <el-input v-model="maintenanceForm.responsible_person" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="maintenanceForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintenanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaintenance">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增故障报修对话框 -->
    <el-dialog v-model="faultDialogVisible" title="故障报修" width="500px">
      <el-form :model="faultForm" label-width="100px" :rules="faultRules" ref="faultFormRef">
        <el-form-item label="设备名称" prop="equipment_name">
          <el-input v-model="faultForm.equipment_name" />
        </el-form-item>
        <el-form-item label="故障类型" prop="fault_type">
          <el-select v-model="faultForm.fault_type" style="width: 100%">
            <el-option label="硬件" value="硬件" />
            <el-option label="软件" value="软件" />
            <el-option label="操作失误" value="操作失误" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障描述" prop="description">
          <el-input v-model="faultForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faultDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFault">提交报修</el-button>
      </template>
    </el-dialog>

    <!-- 派单对话框 -->
    <el-dialog v-model="dispatchDialogVisible" title="派单" width="400px">
      <el-form :model="dispatchForm" label-width="100px">
        <el-form-item label="维修人员">
          <el-input v-model="dispatchForm.repair_person" />
        </el-form-item>
        <el-form-item label="预计完成">
          <el-date-picker v-model="dispatchForm.expected_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDispatch">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import api from '../utils/api'

const calendarDate = ref(new Date())
const calendarData = ref([])
const faultFilter = ref('')
const faults = ref([])
const faultStatuses = ['待派单', '维修中', '已完成', '已关闭']

const taskDialogVisible = ref(false)
const selectedDate = ref('')
const dayTasks = ref([])

const maintenanceDialogVisible = ref(false)
const maintenanceFormRef = ref(null)
const maintenanceForm = ref({})
const maintenanceRules = {
  equipment_name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择维护类型', trigger: 'change' }],
  scheduled_date: [{ required: true, message: '请选择计划日期', trigger: 'change' }],
  responsible_person: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}

const faultDialogVisible = ref(false)
const faultFormRef = ref(null)
const faultForm = ref({})
const faultRules = {
  equipment_name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  fault_type: [{ required: true, message: '请选择故障类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入故障描述', trigger: 'blur' }]
}

const dispatchDialogVisible = ref(false)
const dispatchForm = ref({})
const dispatchingFault = ref(null)

const deptChartRef = ref(null)
const faultPieRef = ref(null)
let deptChart = null
let faultPieChart = null

// 数据状态
const hasDeptData = ref(false)

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const getTaskCount = (day) => {
  const item = calendarData.value.find(d => d.scheduled_date === day)
  return item?.count || 0
}

const getFaultsByStatus = (status) => {
  return faults.value.filter(f => f.status === status)
}

const getFaultTypeColor = (type) => {
  const map = { '硬件': 'danger', '软件': 'warning', '操作失误': 'info' }
  return map[type] || 'info'
}

const getMaintenanceTypeColor = (type) => {
  const map = { '日常维护': '', '校准': 'warning', '故障维修': 'danger' }
  return map[type] || ''
}

const fetchCalendarData = async () => {
  const date = calendarDate.value
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  try {
    const data = await api.get('/maintenance/calendar', { params: { year, month } })
    calendarData.value = data
  } catch (e) {}
}

const fetchFaults = async () => {
  try {
    const params = {}
    if (faultFilter.value) params.fault_type = faultFilter.value
    const data = await api.get('/maintenance/faults', { params })
    faults.value = data
  } catch (e) {}
}

const fetchStats = async () => {
  try {
    const [maintenanceStats, faultStats] = await Promise.all([
      api.get('/maintenance/stats/overview'),
      api.get('/maintenance/faults/stats')
    ])

    // 科室维护完成情况
    if (maintenanceStats.byDepartment?.length && maintenanceStats.byDepartment.some(d => d.total > 0)) {
      hasDeptData.value = true
      deptChart = echarts.init(deptChartRef.value)
      deptChart.setOption({
        tooltip: { trigger: 'axis', confine: true },
        legend: { data: ['已完成', '未完成'], bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: 50, right: 20, top: 10, bottom: 45 },
        xAxis: { type: 'category', data: maintenanceStats.byDepartment.map(d => d.department || '未分配'), axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [
          {
            name: '已完成',
            type: 'bar',
            stack: 'total',
            data: maintenanceStats.byDepartment.map(d => d.completed),
            itemStyle: { color: '#10b981' }
          },
          {
            name: '未完成',
            type: 'bar',
            stack: 'total',
            data: maintenanceStats.byDepartment.map(d => d.total - d.completed),
            itemStyle: { color: '#f59e0b' }
          }
        ]
      })
    } else {
      hasDeptData.value = false
    }

    // 故障类型占比
    if (faultStats.byType?.length) {
      faultPieChart = echarts.init(faultPieRef.value)
      faultPieChart.setOption({
        tooltip: { trigger: 'item', confine: true },
        series: [{
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '50%'],
          data: faultStats.byType.map(t => ({
            name: t.fault_type,
            value: t.count
          })),
          label: { show: true, formatter: '{b}: {c}', fontSize: 11 },
          itemStyle: { borderRadius: 4 }
        }]
      })
    }
  } catch (e) {}
}

const handleDateClick = async (day) => {
  selectedDate.value = day
  try {
    const data = await api.get('/maintenance', { params: { date: day } })
    dayTasks.value = data
    taskDialogVisible.value = true
  } catch (e) {}
}

const handleCompleteTask = async (task) => {
  ElMessageBox.confirm('确定完成该维护任务吗？', '提示').then(async () => {
    await api.put(`/maintenance/${task.id}/status`, { status: '已完成' })
    ElMessage.success('任务已完成')
    handleDateClick(selectedDate.value)
    fetchCalendarData()
  })
}

const handleAddMaintenance = () => {
  maintenanceForm.value = {}
  maintenanceDialogVisible.value = true
}

const submitMaintenance = async () => {
  const valid = await maintenanceFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/maintenance', maintenanceForm.value)
    ElMessage.success('维护任务创建成功')
    maintenanceDialogVisible.value = false
    fetchCalendarData()
  } catch (e) {}
}

const handleAddFault = () => {
  faultForm.value = {}
  faultDialogVisible.value = true
}

const submitFault = async () => {
  const valid = await faultFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/maintenance/faults', faultForm.value)
    ElMessage.success('故障报修提交成功')
    faultDialogVisible.value = false
    fetchFaults()
  } catch (e) {}
}

const handleDispatch = (fault) => {
  dispatchingFault.value = fault
  dispatchForm.value = { repair_person: '', expected_date: '' }
  dispatchDialogVisible.value = true
}

const confirmDispatch = async () => {
  await api.put(`/maintenance/faults/${dispatchingFault.value.id}/status`, {
    status: '维修中',
    ...dispatchForm.value
  })
  ElMessage.success('派单成功')
  dispatchDialogVisible.value = false
  fetchFaults()
}

const handleComplete = async (fault) => {
  ElMessageBox.confirm('确定该故障已修复完成吗？', '提示').then(async () => {
    await api.put(`/maintenance/faults/${fault.id}/status`, { status: '已完成' })
    ElMessage.success('已标记完成')
    fetchFaults()
  })
}

const handleClose = async (fault) => {
  ElMessageBox.confirm('确定关闭该故障单吗？', '提示').then(async () => {
    await api.put(`/maintenance/faults/${fault.id}/status`, { status: '已关闭' })
    ElMessage.success('已关闭')
    fetchFaults()
  })
}

const handleResize = () => {
  deptChart?.resize()
  faultPieChart?.resize()
}

watch(calendarDate, () => {
  fetchCalendarData()
})

onMounted(() => {
  fetchCalendarData()
  fetchFaults()
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  deptChart?.dispose()
  faultPieChart?.dispose()
})
</script>

<style scoped>
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: calc(100% - 70px);
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.right-section {
  overflow-y: auto;
}

.calendar-card {
  flex-shrink: 0;
}

.calendar-card h3,
.fault-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.calendar-cell .day-num {
  font-size: 14px;
}

.calendar-cell .task-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.calendar-cell .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ddd;
}

.calendar-cell .dot.has-task {
  background: var(--medical-primary);
}

.calendar-cell .count {
  font-size: 10px;
  color: var(--medical-primary);
}

.chart-container {
  height: 220px;
}

.fault-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-area {
  display: flex;
  gap: 12px;
}

.filter-area .el-select {
  width: 120px;
}

.fault-stats {
  margin-bottom: 16px;
}

.chart-mini {
  height: 130px;
}

.kanban-container {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-column {
  min-width: 200px;
  flex: 1;
  background: var(--medical-bg);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.kanban-column .column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.kanban-column .count {
  background: var(--medical-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.kanban-cards {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fault-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.fault-card .fault-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.fault-card .report-no {
  font-size: 12px;
  color: var(--medical-text-secondary);
}

.fault-card .fault-name {
  font-weight: 600;
  margin-bottom: 6px;
}

.fault-card .fault-desc {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fault-card .fault-info {
  font-size: 12px;
  color: var(--medical-text-secondary);
  display: flex;
  justify-content: space-between;
}

.fault-card .fault-actions {
  margin-top: 10px;
}

.task-list {
  max-height: 400px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--medical-bg);
  border-radius: 8px;
  margin-bottom: 10px;
}

.task-item .task-info {
  flex: 1;
}

.task-item .task-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.task-item .task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--medical-text-secondary);
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
