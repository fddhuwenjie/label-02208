<!--
  数据统计页面
  功能：
  - 核心运营指标展示（设备利用率、维护成本占比、平均修复时长）
  - 设备生命周期漏斗图
  - 科室设备密度热力图
  - 自定义统计分析（按月/季度/年）
  - 导出统计报告
  
  @author Medical Equipment Team
  @version 1.0.0
-->
<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">数据统计</h1>
      <div class="header-actions">
        <el-button @click="exportReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 核心运营指标卡片 -->
    <div class="indicator-row">
      <div class="indicator-card large">
        <div class="indicator-icon" style="background: #ecfdf5;">
          <el-icon :size="32" color="#10b981"><TrendCharts /></el-icon>
        </div>
        <div class="indicator-content">
          <div class="value">{{ indicators.utilizationRate }}%</div>
          <div class="label">设备利用率</div>
          <div class="desc">在役设备 / 总设备</div>
        </div>
      </div>
      <div class="indicator-card large">
        <div class="indicator-icon" style="background: #fef3c7;">
          <el-icon :size="32" color="#f59e0b"><Money /></el-icon>
        </div>
        <div class="indicator-content">
          <div class="value">{{ indicators.maintenanceCostRate }}%</div>
          <div class="label">维护成本占比</div>
          <div class="desc">维护成本 / 设备总值</div>
        </div>
      </div>
      <div class="indicator-card large">
        <div class="indicator-icon" style="background: #fef2f2;">
          <el-icon :size="32" color="#ef4444"><Clock /></el-icon>
        </div>
        <div class="indicator-content">
          <div class="value">{{ indicators.avgRepairTime }}h</div>
          <div class="label">平均修复时长</div>
          <div class="desc">故障报修到完成</div>
        </div>
      </div>
    </div>

    <!-- 漏斗图 + 热力图 -->
    <div class="grid-container grid-2 chart-row">
      <div class="medical-card">
        <h3>设备生命周期漏斗</h3>
        <div class="chart-container" ref="funnelChartRef"></div>
      </div>
      <div class="medical-card">
        <h3>科室设备密度热力图</h3>
        <div class="chart-container" ref="heatmapChartRef"></div>
      </div>
    </div>

    <!-- 自定义统计分析区域 -->
    <div class="medical-card custom-stats">
      <div class="section-header">
        <h3>自定义统计分析</h3>
        <div class="filter-area">
          <el-select v-model="period" size="small" @change="fetchCustomStats">
            <el-option label="按月" value="month" />
            <el-option label="按季度" value="quarter" />
            <el-option label="按年" value="year" />
          </el-select>
          <el-select v-model="filterDepartment" placeholder="选择科室" clearable size="small" @change="fetchCustomStats">
            <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
          </el-select>
          <el-select v-model="filterType" placeholder="选择类型" clearable size="small" @change="fetchCustomStats">
            <el-option v-for="t in types" :key="t" :label="t" :value="t" />
          </el-select>
        </div>
      </div>

      <!-- 趋势图表网格 -->
      <div class="grid-container grid-2">
        <div class="chart-wrapper">
          <h4>设备新增趋势</h4>
          <div class="chart-container" ref="equipmentTrendRef"></div>
        </div>
        <div class="chart-wrapper">
          <h4>采购金额趋势</h4>
          <div class="chart-container" ref="purchaseTrendRef"></div>
        </div>
        <div class="chart-wrapper">
          <h4>维护成本趋势</h4>
          <div class="chart-container" ref="maintenanceTrendRef"></div>
        </div>
        <div class="chart-wrapper">
          <h4>故障发生趋势</h4>
          <div class="chart-container" ref="faultTrendRef"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 数据统计页面脚本
 * 
 * 主要功能：
 * 1. 展示核心运营指标
 * 2. 渲染生命周期漏斗图和热力图
 * 3. 自定义时间维度的趋势分析
 * 4. 导出统计报告
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import api from '../utils/api'

// ==================== 状态定义 ====================

/** 核心指标数据 */
const indicators = ref({
  utilizationRate: 0,      // 设备利用率
  maintenanceCostRate: 0,  // 维护成本占比
  avgRepairTime: 0         // 平均修复时长
})

/** 筛选条件 */
const period = ref('month')           // 统计周期
const filterDepartment = ref('')      // 科室筛选
const filterType = ref('')            // 类型筛选
const departments = ref([])           // 科室选项
const types = ref([])                 // 类型选项

// ==================== 图表引用 ====================

const funnelChartRef = ref(null)
const heatmapChartRef = ref(null)
const equipmentTrendRef = ref(null)
const purchaseTrendRef = ref(null)
const maintenanceTrendRef = ref(null)
const faultTrendRef = ref(null)

let funnelChart = null
let heatmapChart = null
let equipmentTrendChart = null
let purchaseTrendChart = null
let maintenanceTrendChart = null
let faultTrendChart = null

// ==================== 数据获取 ====================

/** 获取下拉选项 */
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
 * 获取生命周期统计数据
 * 包括漏斗图、热力图和核心指标
 */
const fetchLifecycleStats = async () => {
  try {
    const data = await api.get('/statistics/lifecycle')
    
    // 更新核心指标
    indicators.value = data.indicators

    // ========== 漏斗图配置 ==========
    funnelChart = echarts.init(funnelChartRef.value)
    funnelChart.setOption({
      tooltip: { 
        trigger: 'item', 
        formatter: '{b}: {c}' 
      },
      series: [{
        type: 'funnel',
        left: '10%',
        width: '80%',
        top: 40,
        bottom: 40,
        min: 0,
        max: Math.max(data.funnel.purchased, 100),
        sort: 'descending',
        gap: 4,
        label: { 
          show: true, 
          position: 'inside', 
          formatter: '{b}\n{c}' 
        },
        itemStyle: { 
          borderColor: '#fff', 
          borderWidth: 2 
        },
        data: [
          { value: data.funnel.purchased, name: '采购申请', itemStyle: { color: '#3b82f6' } },
          { value: data.funnel.stored, name: '入库', itemStyle: { color: '#0d9488' } },
          { value: data.funnel.inUse, name: '使用中', itemStyle: { color: '#10b981' } },
          { value: data.funnel.maintained, name: '已维护', itemStyle: { color: '#f59e0b' } },
          { value: data.funnel.scrapped, name: '已报废', itemStyle: { color: '#6b7280' } }
        ]
      }]
    })

    // ========== 热力图配置 ==========
    if (data.departmentHeatmap?.length) {
      const depts = data.departmentHeatmap.map(d => d.department)
      const metrics = ['设备数', '故障数', '维护数']
      const heatData = []
      
      // 构建热力图数据矩阵
      data.departmentHeatmap.forEach((d, i) => {
        heatData.push([0, i, d.equipment_count])
        heatData.push([1, i, d.fault_count])
        heatData.push([2, i, d.maintenance_count])
      })

      const maxVal = Math.max(...heatData.map(d => d[2]))

      heatmapChart = echarts.init(heatmapChartRef.value)
      heatmapChart.setOption({
        tooltip: {
          position: 'top',
          formatter: p => `${depts[p.data[1]]}<br/>${metrics[p.data[0]]}: ${p.data[2]}`
        },
        grid: { left: 80, right: 40, top: 20, bottom: 40 },
        xAxis: { 
          type: 'category', 
          data: metrics, 
          splitArea: { show: true } 
        },
        yAxis: { 
          type: 'category', 
          data: depts, 
          splitArea: { show: true } 
        },
        visualMap: {
          min: 0,
          max: maxVal || 50,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          inRange: { color: ['#f0fdfa', '#0d9488'] }
        },
        series: [{
          type: 'heatmap',
          data: heatData,
          label: { show: true },
          emphasis: { 
            itemStyle: { 
              shadowBlur: 10, 
              shadowColor: 'rgba(0, 0, 0, 0.5)' 
            } 
          }
        }]
      })
    }
  } catch (e) {
    console.error('获取生命周期统计失败:', e)
  }
}

/**
 * 获取自定义统计数据
 * 根据选择的周期和筛选条件获取趋势数据
 */
const fetchCustomStats = async () => {
  try {
    const params = { period: period.value }
    if (filterDepartment.value) params.department = filterDepartment.value
    if (filterType.value) params.type = filterType.value

    const data = await api.get('/statistics/custom', { params })

    // ========== 设备新增趋势柱状图 ==========
    equipmentTrendChart = echarts.init(equipmentTrendRef.value)
    equipmentTrendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { 
        type: 'category', 
        data: data.equipmentTrend.map(t => t.period) 
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: data.equipmentTrend.map(t => t.count),
        itemStyle: { 
          color: '#0d9488', 
          borderRadius: [4, 4, 0, 0] 
        }
      }]
    })

    // ========== 采购金额趋势折线图 ==========
    purchaseTrendChart = echarts.init(purchaseTrendRef.value)
    purchaseTrendChart.setOption({
      tooltip: { 
        trigger: 'axis', 
        formatter: p => `${p[0].name}<br/>金额: ¥${(p[0].value / 10000).toFixed(1)}万` 
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { 
        type: 'category', 
        data: data.purchaseTrend.map(t => t.period) 
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { formatter: v => (v / 10000).toFixed(0) + '万' } 
      },
      series: [{
        type: 'line',
        data: data.purchaseTrend.map(t => t.amount || 0),
        smooth: true,
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.1)' }
      }]
    })

    // ========== 维护成本趋势柱状图 ==========
    maintenanceTrendChart = echarts.init(maintenanceTrendRef.value)
    maintenanceTrendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { 
        type: 'category', 
        data: data.maintenanceTrend.map(t => t.period) 
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { formatter: v => (v / 1000).toFixed(0) + 'k' } 
      },
      series: [{
        type: 'bar',
        data: data.maintenanceTrend.map(t => t.cost || 0),
        itemStyle: { 
          color: '#f59e0b', 
          borderRadius: [4, 4, 0, 0] 
        }
      }]
    })

    // ========== 故障趋势折线图 ==========
    faultTrendChart = echarts.init(faultTrendRef.value)
    faultTrendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { 
        type: 'category', 
        data: data.faultTrend.map(t => t.period) 
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'line',
        data: data.faultTrend.map(t => t.count),
        smooth: true,
        itemStyle: { color: '#ef4444' },
        areaStyle: { color: 'rgba(239, 68, 68, 0.1)' }
      }]
    })
  } catch (e) {
    console.error('获取自定义统计失败:', e)
  }
}

/**
 * 导出统计报告
 * 生成包含汇总数据、科室分布、类型分布的文本报告
 */
const exportReport = async () => {
  try {
    // 获取导出数据
    const data = await api.get('/statistics/export', { 
      params: { period: period.value } 
    })
    
    // 格式化周期名称
    const periodName = {
      'month': '按月',
      'quarter': '按季度',
      'year': '按年'
    }[data.period] || '按月'
    
    // 构建报告内容
    const report = `
═══════════════════════════════════════════════════════════════
              医疗设备全周期管理统计报告
═══════════════════════════════════════════════════════════════

生成时间: ${new Date(data.generatedAt).toLocaleString('zh-CN')}
统计周期: ${periodName}

───────────────────────────────────────────────────────────────
一、总体概况
───────────────────────────────────────────────────────────────
  设备总数:       ${data.summary.totalEquipment} 台
  在役设备:       ${data.summary.activeEquipment} 台
  待维护设备:     ${data.summary.pendingMaintenance} 台
  故障设备:       ${data.summary.faultEquipment} 台
  采购总金额:     ¥${(data.summary.totalPurchaseAmount / 10000).toFixed(2)} 万
  维护总成本:     ¥${(data.summary.totalMaintenanceCost / 10000).toFixed(2)} 万
  故障总数:       ${data.summary.totalFaultCount} 次
  报废总数:       ${data.summary.totalScrapCount} 台

───────────────────────────────────────────────────────────────
二、科室分布
───────────────────────────────────────────────────────────────
${data.byDepartment.map(d => 
  `  ${d.department.padEnd(8, '　')}: 总计${String(d.total).padStart(3)}台, 在役${String(d.active).padStart(3)}台, 待维护${String(d.pending_maintenance).padStart(2)}台, 故障${String(d.fault).padStart(2)}台`
).join('\n')}

───────────────────────────────────────────────────────────────
三、类型分布
───────────────────────────────────────────────────────────────
${data.byType.map(t => 
  `  ${t.type.padEnd(8, '　')}: ${String(t.total).padStart(3)}台, 总值 ¥${(t.total_value / 10000).toFixed(2)}万`
).join('\n')}

═══════════════════════════════════════════════════════════════
                        报告结束
═══════════════════════════════════════════════════════════════
    `.trim()

    // 下载文件
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `医疗设备统计报告_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)

    ElMessage.success('报告导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

// ==================== 生命周期 ====================

/** 窗口大小变化时重绘所有图表 */
const handleResize = () => {
  funnelChart?.resize()
  heatmapChart?.resize()
  equipmentTrendChart?.resize()
  purchaseTrendChart?.resize()
  maintenanceTrendChart?.resize()
  faultTrendChart?.resize()
}

onMounted(() => {
  fetchOptions()
  fetchLifecycleStats()
  fetchCustomStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 销毁所有图表实例
  funnelChart?.dispose()
  heatmapChart?.dispose()
  equipmentTrendChart?.dispose()
  purchaseTrendChart?.dispose()
  maintenanceTrendChart?.dispose()
  faultTrendChart?.dispose()
})
</script>

<style scoped>
/* 指标卡片行 */
.indicator-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 大号指标卡片 */
.indicator-card.large {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
}

.indicator-card .indicator-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-card .indicator-content .value {
  font-size: 36px;
  font-weight: 700;
  color: var(--medical-primary);
}

.indicator-card .indicator-content .label {
  font-size: 16px;
  color: var(--medical-text);
  margin-top: 4px;
}

.indicator-card .indicator-content .desc {
  font-size: 13px;
  color: var(--medical-text-secondary);
  margin-top: 4px;
}

/* 图表行 */
.chart-row {
  margin-bottom: 20px;
}

.chart-row h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.chart-row .chart-container {
  height: 300px;
}

/* 自定义统计区域 */
.custom-stats {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 16px;
}

.filter-area {
  display: flex;
  gap: 12px;
}

/* 图表包装器 */
.chart-wrapper {
  background: var(--medical-bg);
  border-radius: 10px;
  padding: 16px;
}

.chart-wrapper h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--medical-text);
}

.chart-wrapper .chart-container {
  height: 200px;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .indicator-row {
    flex-wrap: wrap;
  }
  
  .indicator-card.large {
    min-width: calc(50% - 10px);
  }
}

@media (max-width: 768px) {
  .indicator-card.large {
    min-width: 100%;
  }
}
</style>
