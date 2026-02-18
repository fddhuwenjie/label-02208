<!--
  数据总览仪表盘页面
  功能：
  - 核心指标展示（设备总数、在役设备、待维护、高风险、本月采购）
  - 设备状态分布饼图（可点击跳转）
  - 设备类型与科室分布堆叠柱状图
  - 维护计划进度展示
  - 近期待办提醒（采购审批、故障报修、校准到期）
  
  @author Medical Equipment Team
  @version 1.0.0
-->
<template>
  <div class="page-container dashboard-page">
    <div class="page-header">
      <h1 class="page-title">数据总览</h1>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>

    <div class="dashboard-content">
      <!-- 上半部分：固定不滚动 -->
      <div class="top-section">
        <!-- 核心指标卡片区 -->
        <div class="grid-container grid-5 indicator-section">
          <div class="indicator-card" v-for="item in indicators" :key="item.key">
            <div class="icon-wrapper" :style="{ background: item.bgColor }">
              <el-icon :size="28" :color="item.color"><component :is="item.icon" /></el-icon>
            </div>
            <div class="content">
              <div class="value" :style="{ color: item.color }">{{ item.value }}</div>
              <div class="label">{{ item.label }}</div>
              <div class="trend" :class="item.trend > 0 ? 'up' : 'down'" v-if="item.trend !== undefined">
                <el-icon><component :is="item.trend > 0 ? 'Top' : 'Bottom'" /></el-icon>
                {{ Math.abs(item.trend) }}% 环比
              </div>
            </div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid-container grid-2 chart-section">
          <!-- 设备状态分布 -->
          <div class="medical-card">
            <div class="card-header">
              <h3>设备状态分布</h3>
              <span class="hint">点击可跳转对应管理页面</span>
            </div>
            <div class="chart-container" ref="statusChartRef" v-show="hasStatusData"></div>
            <el-empty v-show="!hasStatusData" description="暂无设备数据" :image-size="80" />
          </div>

          <!-- 设备类型与科室分布 -->
          <div class="medical-card">
            <div class="card-header">
              <h3>设备类型与科室分布</h3>
            </div>
            <div class="chart-container" ref="typeDeptChartRef" v-show="hasTypeDeptData"></div>
            <el-empty v-show="!hasTypeDeptData" description="暂无分布数据" :image-size="80" />
          </div>
        </div>
      </div>

      <!-- 下半部分：横向滚动 -->
      <div class="bottom-section">
        <div class="bottom-scroll-wrapper">
          <div class="bottom-cards">
            <!-- 维护计划进度 -->
            <div class="medical-card progress-card">
              <div class="card-header">
                <h3>维护计划进度</h3>
              </div>
              <div class="progress-card-content">
                <div class="progress-list">
                  <div class="progress-item">
                    <div class="progress-label">
                      <span>本月维护完成率</span>
                      <span class="rate-value" :class="maintenanceProgress.monthRate >= 80 ? 'good' : maintenanceProgress.monthRate >= 60 ? 'warn' : 'bad'">{{ maintenanceProgress.monthRate }}%</span>
                    </div>
                    <div class="progress-bar-wrapper">
                      <el-progress 
                        :percentage="maintenanceProgress.monthRate" 
                        :color="getProgressColor(maintenanceProgress.monthRate)"
                        :stroke-width="10"
                        :show-text="false"
                      />
                      <div class="target-line" style="left: 80%;" title="目标值: 80%"></div>
                    </div>
                    <div class="progress-detail">
                      已完成 {{ maintenanceProgress.monthCompleted }} / {{ maintenanceProgress.monthTotal }} 项 <span class="target-hint">（目标≥80%）</span>
                    </div>
                  </div>
                  <div class="progress-item">
                    <div class="progress-label">
                      <span>年度校准完成率</span>
                      <span class="rate-value" :class="maintenanceProgress.yearCalibrationRate >= 80 ? 'good' : maintenanceProgress.yearCalibrationRate >= 60 ? 'warn' : 'bad'">{{ maintenanceProgress.yearCalibrationRate }}%</span>
                    </div>
                    <div class="progress-bar-wrapper">
                      <el-progress 
                        :percentage="maintenanceProgress.yearCalibrationRate" 
                        :color="getProgressColor(maintenanceProgress.yearCalibrationRate)"
                        :stroke-width="10"
                        :show-text="false"
                      />
                      <div class="target-line" style="left: 80%;" title="目标值: 80%"></div>
                    </div>
                    <div class="progress-detail">
                      已完成 {{ maintenanceProgress.yearCalibrationCompleted }} / {{ maintenanceProgress.yearCalibrationTotal }} 项 <span class="target-hint">（目标≥80%）</span>
                    </div>
                  </div>
                </div>
                <div class="pending-list" v-if="maintenanceProgress.pendingItems?.length">
                  <h4>未完成项</h4>
                  <div class="pending-cards-wrapper">
                    <div class="pending-cards">
                      <div class="pending-card" v-for="item in maintenanceProgress.pendingItems" :key="item.id">
                        <div class="name">{{ item.equipment_name }}</div>
                        <div class="info">{{ item.type }} · {{ item.scheduled_date }}</div>
                        <div class="person">{{ item.responsible_person }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 近期待办提醒 -->
            <div class="medical-card todo-card">
              <div class="card-header">
                <h3>近期待办提醒</h3>
              </div>
              <div class="todo-section">
                <div class="todo-category" v-if="todos.purchases?.length">
                  <h4><el-icon><ShoppingCart /></el-icon> 待审核采购申请 ({{ todos.purchases.length }})</h4>
                  <div class="card-flow">
                    <div class="task-card" v-for="item in todos.purchases" :key="item.id">
                      <div class="title">{{ item.name }}</div>
                      <div class="info">申请单号：{{ item.code }}</div>
                      <div class="info">申请科室：{{ item.department }}</div>
                      <div class="actions">
                        <el-button size="small" type="primary" @click="goToPurchase">处理</el-button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="todo-category" v-if="todos.faults?.length">
                  <h4><el-icon><Warning /></el-icon> 待处理故障报修 ({{ todos.faults.length }})</h4>
                  <div class="card-flow">
                    <div class="task-card warning" v-for="item in todos.faults" :key="item.id">
                      <div class="title">{{ item.name }}</div>
                      <div class="info">报修单号：{{ item.code }}</div>
                      <div class="info">故障类型：{{ item.description }}</div>
                      <div class="actions">
                        <el-button size="small" type="warning" @click="goToMaintenance">处理</el-button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="todo-category" v-if="todos.calibrations?.length">
                  <h4><el-icon><Clock /></el-icon> 即将到期校准设备 ({{ todos.calibrations.length }})</h4>
                  <div class="card-flow">
                    <div class="task-card danger" v-for="item in todos.calibrations" :key="item.id">
                      <div class="title">{{ item.name }}</div>
                      <div class="info">截止日期：{{ item.deadline }}</div>
                      <div class="info">负责人：{{ item.responsible_person }}</div>
                      <div class="actions">
                        <el-button size="small" type="danger" @click="goToMaintenance">查看详情</el-button>
                      </div>
                    </div>
                  </div>
                </div>
                <el-empty v-if="!todos.purchases?.length && !todos.faults?.length && !todos.calibrations?.length" description="暂无待办事项" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 数据总览仪表盘脚本
 * 
 * 主要功能：
 * 1. 展示核心运营指标（设备数量、状态统计）
 * 2. 渲染设备状态分布饼图（支持点击跳转）
 * 3. 渲染设备类型与科室分布堆叠柱状图
 * 4. 展示维护计划进度和未完成项
 * 5. 展示待办提醒（采购、故障、校准）
 */
import { ref, onMounted, onUnmounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import api from '../utils/api'
import { Monitor, Tools, Warning, ShoppingCart, TrendCharts, Clock } from '@element-plus/icons-vue'

// ==================== 路由 ====================
const router = useRouter()

// ==================== 图表引用 ====================
const statusChartRef = ref(null)
const typeDeptChartRef = ref(null)
let statusChart = null
let typeDeptChart = null

// ==================== 数据状态 ====================
const hasStatusData = ref(false)
const hasTypeDeptData = ref(false)

// ==================== 核心指标数据 ====================
/** 
 * 指标卡片配置
 * 包含：设备总数、在役设备、待维护、高风险、本月采购
 */
const indicators = ref([
  { key: 'total', label: '设备总数', value: 0, icon: markRaw(Monitor), color: '#0d9488', bgColor: '#f0fdfa' },
  { key: 'active', label: '在役设备', value: 0, icon: markRaw(Monitor), color: '#10b981', bgColor: '#ecfdf5' },
  { key: 'pending', label: '待维护设备', value: 0, icon: markRaw(Tools), color: '#f59e0b', bgColor: '#fffbeb' },
  { key: 'risk', label: '高风险设备', value: 0, icon: markRaw(Warning), color: '#ef4444', bgColor: '#fef2f2' },
  { key: 'purchase', label: '本月新增采购', value: 0, icon: markRaw(ShoppingCart), color: '#3b82f6', bgColor: '#eff6ff', trend: 0 }
])

// ==================== 维护进度数据 ====================
const maintenanceProgress = ref({
  monthRate: 0,              // 本月维护完成率
  monthTotal: 0,             // 本月维护总数
  monthCompleted: 0,         // 本月已完成数
  yearCalibrationRate: 0,    // 年度校准完成率
  yearCalibrationTotal: 0,   // 年度校准总数
  yearCalibrationCompleted: 0, // 年度校准已完成数
  pendingItems: []           // 未完成项列表
})

// ==================== 待办数据 ====================
const todos = ref({
  purchases: [],    // 待审核采购
  faults: [],       // 待处理故障
  calibrations: []  // 即将到期校准
})

// ==================== 工具函数 ====================

/**
 * 根据完成率返回进度条颜色
 * @param {number} rate - 完成率百分比
 * @returns {string} 颜色值
 */
const getProgressColor = (rate) => {
  if (rate >= 80) return '#10b981'  // 绿色：良好
  if (rate >= 60) return '#f59e0b'  // 黄色：一般
  return '#ef4444'                   // 红色：需关注
}

/** 跳转到采购管理页面 */
const goToPurchase = () => router.push('/purchase')
/** 跳转到维护管理页面 */
const goToMaintenance = () => router.push('/maintenance')

// ==================== 数据获取函数 ====================

/**
 * 获取核心指标数据
 * 包括设备总数、各状态数量、本月采购等
 */
const fetchIndicators = async () => {
  try {
    const data = await api.get('/dashboard/indicators')
    indicators.value[0].value = data.total
    indicators.value[1].value = data.active
    indicators.value[2].value = data.pendingMaintenance
    indicators.value[3].value = data.highRisk
    indicators.value[4].value = data.monthlyPurchase
    indicators.value[4].trend = data.purchaseGrowth
  } catch (e) {
    console.error('获取指标数据失败:', e)
  }
}

/**
 * 获取设备状态分布并渲染饼图
 * 支持点击跳转到对应管理页面
 */
const fetchStatusDistribution = async () => {
  try {
    const data = await api.get('/dashboard/status-distribution')
    
    // 检查是否有数据
    if (!data?.length || data.every(d => d.count === 0)) {
      hasStatusData.value = false
      return
    }
    hasStatusData.value = true
    
    // 状态颜色映射
    const statusColors = {
      '正常使用': '#10b981',
      '待维护': '#f59e0b',
      '故障停机': '#ef4444',
      '待报废': '#8b5cf6',
      '已报废': '#6b7280'
    }
    
    // 初始化饼图
    statusChart = echarts.init(statusChartRef.value)
    statusChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12 }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: data.map(item => ({
          name: item.status,
          value: item.count,
          itemStyle: { color: statusColors[item.status] || '#999' }
        }))
      }]
    })

    // 点击事件：跳转到对应页面
    statusChart.on('click', (params) => {
      if (params.name === '待维护') router.push('/maintenance')
      else if (params.name === '待报废' || params.name === '已报废') router.push('/scrap')
      else router.push('/equipment')
    })
  } catch (e) {
    console.error('获取状态分布失败:', e)
    hasStatusData.value = false
  }
}

/**
 * 获取设备类型与科室分布并渲染堆叠柱状图
 */
const fetchTypeDeptDistribution = async () => {
  try {
    const data = await api.get('/dashboard/type-department')
    
    // 检查是否有数据
    if (!data?.types?.length || !data?.series?.length) {
      hasTypeDeptData.value = false
      return
    }
    hasTypeDeptData.value = true
    
    typeDeptChart = echarts.init(typeDeptChartRef.value)
    typeDeptChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true
      },
      legend: {
        data: data.departments,
        type: 'scroll',
        bottom: 0,
        itemGap: 8,
        itemWidth: 10,
        itemHeight: 8,
        textStyle: { fontSize: 10 },
        pageIconSize: 10
      },
      grid: {
        left: 40,
        right: 10,
        top: 15,
        bottom: 80
      },
      xAxis: {
        type: 'category',
        data: data.types,
        axisLabel: { 
          interval: 0, 
          rotate: 45,
          fontSize: 10,
          margin: 8
        }
      },
      yAxis: { 
        type: 'value', 
        name: '数量',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 }
      },
      series: data.series.map((s, i) => ({
        name: s.name,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 25,
        data: s.data,
        itemStyle: {
          color: ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'][i % 8]
        }
      }))
    })
  } catch (e) {
    console.error('获取类型科室分布失败:', e)
    hasTypeDeptData.value = false
  }
}

/** 获取维护进度数据 */
const fetchMaintenanceProgress = async () => {
  try {
    const data = await api.get('/dashboard/maintenance-progress')
    maintenanceProgress.value = data
  } catch (e) {
    console.error('获取维护进度失败:', e)
  }
}

/** 获取待办提醒数据 */
const fetchTodos = async () => {
  try {
    const data = await api.get('/dashboard/todos')
    todos.value = data
  } catch (e) {
    console.error('获取待办数据失败:', e)
  }
}

/** 刷新所有数据 */
const refreshData = async () => {
  await fetchIndicators()
  await fetchStatusDistribution()
  await fetchTypeDeptDistribution()
  await fetchMaintenanceProgress()
  await fetchTodos()
  // 图表初始化后延迟resize确保正确渲染
  setTimeout(() => {
    statusChart?.resize()
    typeDeptChart?.resize()
  }, 100)
}

// ==================== 生命周期 ====================

/** 窗口大小变化时重绘图表 */
const handleResize = () => {
  statusChart?.resize()
  typeDeptChart?.resize()
}

onMounted(() => {
  refreshData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  statusChart?.dispose()
  typeDeptChart?.dispose()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.dashboard-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.top-section {
  flex-shrink: 0;
}

.bottom-section {
  flex-shrink: 0;
  margin-top: 20px;
}

.bottom-scroll-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  padding-bottom: 20px;
}

.bottom-cards {
  display: flex;
  gap: 20px;
}

.bottom-cards .medical-card {
  flex: 1;
  min-width: 0;
}

.grid-5 {
  grid-template-columns: repeat(5, 1fr);
}

@media (max-width: 1400px) {
  .grid-5 { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
  .grid-5 { grid-template-columns: repeat(2, 1fr); }
}

.indicator-section {
  margin-bottom: 20px;
}

.indicator-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 20px;
}

.indicator-card .icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-card .content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.indicator-card .value {
  font-size: 32px;
  font-weight: 700;
}

.indicator-card .label {
  font-size: 14px;
  color: var(--medical-text-secondary);
  margin-top: 4px;
}

.indicator-card .trend {
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.chart-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.card-header .hint {
  font-size: 12px;
  color: var(--medical-text-secondary);
}

.chart-container {
  height: 300px;
}

@media (max-width: 1200px) {
  .bottom-cards {
    flex-direction: column;
  }
  
  .bottom-cards .medical-card {
    min-width: 100%;
  }
}

.progress-card-content {
  flex: 1;
}

.progress-list {
  margin-bottom: 20px;
}

.progress-item {
  margin-bottom: 24px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-label .rate-value {
  font-weight: 600;
}

.progress-label .rate-value.good { color: #10b981; }
.progress-label .rate-value.warn { color: #f59e0b; }
.progress-label .rate-value.bad { color: #ef4444; }

.progress-bar-wrapper {
  position: relative;
}

.progress-bar-wrapper .target-line {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #1e293b;
  z-index: 1;
}

.progress-bar-wrapper .target-line::after {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  width: 8px;
  height: 8px;
  background: #1e293b;
  border-radius: 50%;
}

.progress-detail {
  font-size: 12px;
  color: var(--medical-text-secondary);
  margin-top: 6px;
}

.progress-detail .target-hint {
  color: #94a3b8;
}

.pending-list h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--medical-text-secondary);
}

.pending-cards-wrapper {
  /* 不需要滚动 */
}

.pending-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pending-card {
  min-width: 180px;
  width: 180px;
  padding: 12px;
  background: var(--medical-bg);
  border-radius: 8px;
  font-size: 13px;
}

.pending-card .name {
  font-weight: 600;
  margin-bottom: 4px;
}

.pending-card .info {
  color: var(--medical-text-secondary);
  font-size: 12px;
}

.pending-card .person {
  margin-top: 6px;
  color: var(--medical-primary);
  font-size: 12px;
}

.todo-section {
  flex: 1;
}

.todo-category {
  margin-bottom: 20px;
}

.todo-category:last-child {
  margin-bottom: 0;
}

.todo-category h4 {
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--medical-text);
}

.card-flow {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.task-card {
  min-width: 220px;
  flex: 0 0 220px;
}

.task-card .title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.task-card .info {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-bottom: 4px;
}

.task-card .actions {
  margin-top: 12px;
}
</style>
