<template>
  <el-container class="main-layout">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="logo">
        <div class="logo-icon">
          <el-icon :size="28" color="#fff"><FirstAidKit /></el-icon>
        </div>
        <span>医疗设备全周期管理平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        :ellipsis="false"
        router
        class="nav-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据总览</span>
        </el-menu-item>
        <el-menu-item index="/equipment">
          <el-icon><Monitor /></el-icon>
          <span>设备台账</span>
        </el-menu-item>
        <el-menu-item index="/purchase">
          <el-icon><ShoppingCart /></el-icon>
          <span>采购管理</span>
        </el-menu-item>
        <el-menu-item index="/maintenance">
          <el-icon><Tools /></el-icon>
          <span>维护管理</span>
        </el-menu-item>
        <el-menu-item index="/scrap">
          <el-icon><Delete /></el-icon>
          <span>报废管理</span>
        </el-menu-item>
        <el-menu-item index="/statistics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
      </el-menu>
      <div class="user-info">
        <el-dropdown @command="handleCommand">
          <span class="user-dropdown">
            <el-avatar :size="36" :style="{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }">
              {{ userInitial }}
            </el-avatar>
            <span class="username">{{ userName }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人信息
              </el-dropdown-item>
              <el-dropdown-item command="password">
                <el-icon><Lock /></el-icon>修改密码
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    <el-main class="main-content">
      <router-view />
    </el-main>

    <!-- 个人信息对话框 -->
    <el-dialog v-model="profileDialogVisible" title="个人信息" width="500px">
      <el-form :model="profileForm" label-width="80px" :rules="profileRules" ref="profileFormRef">
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="profileForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="所属科室" prop="department">
          <el-select v-model="profileForm.department" placeholder="请选择科室" style="width: 100%">
            <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-tag :type="profileForm.role === 'admin' ? 'danger' : 'info'">
            {{ profileForm.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="450px">
      <el-form :model="passwordForm" label-width="80px" :rules="passwordRules" ref="passwordFormRef">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
          <div class="password-strength-bar">
            <div class="strength-item" :class="{ active: passwordStrength >= 1 }"></div>
            <div class="strength-item" :class="{ active: passwordStrength >= 2 }"></div>
            <div class="strength-item" :class="{ active: passwordStrength >= 3 }"></div>
            <div class="strength-item" :class="{ active: passwordStrength >= 4 }"></div>
          </div>
          <div class="password-hint" :class="strengthClass">{{ strengthText }}</div>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <div class="password-tips">
        <p>密码要求：</p>
        <ul>
          <li :class="{ valid: hasMinLength }">至少8个字符</li>
          <li :class="{ valid: hasUpperCase }">包含大写字母</li>
          <li :class="{ valid: hasLowerCase }">包含小写字母</li>
          <li :class="{ valid: hasNumber }">包含数字</li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="changePassword" :disabled="passwordStrength < 2">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, SwitchButton } from '@element-plus/icons-vue'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

// 用户信息
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const userName = computed(() => user.value.name || user.value.username || '用户')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

// 科室选项
const departments = ref(['放射科', '检验科', '急诊科', '康复科', 'ICU', '手术室', '内科', '外科'])

// ==================== 个人信息 ====================
const profileDialogVisible = ref(false)
const profileFormRef = ref(null)
const profileForm = ref({
  username: '',
  name: '',
  department: '',
  role: ''
})

const profileRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

// ==================== 修改密码 ====================
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码复杂度检查
const hasMinLength = computed(() => passwordForm.value.newPassword.length >= 8)
const hasUpperCase = computed(() => /[A-Z]/.test(passwordForm.value.newPassword))
const hasLowerCase = computed(() => /[a-z]/.test(passwordForm.value.newPassword))
const hasNumber = computed(() => /[0-9]/.test(passwordForm.value.newPassword))

const passwordStrength = computed(() => {
  let strength = 0
  if (hasMinLength.value) strength++
  if (hasUpperCase.value) strength++
  if (hasLowerCase.value) strength++
  if (hasNumber.value) strength++
  return strength
})

const strengthClass = computed(() => {
  if (passwordStrength.value <= 1) return 'weak'
  if (passwordStrength.value <= 2) return 'medium'
  if (passwordStrength.value <= 3) return 'good'
  return 'strong'
})

const strengthText = computed(() => {
  if (!passwordForm.value.newPassword) return ''
  if (passwordStrength.value <= 1) return '密码强度：弱'
  if (passwordStrength.value <= 2) return '密码强度：中'
  if (passwordStrength.value <= 3) return '密码强度：良好'
  return '密码强度：强'
})

// 密码验证规则
const validatePassword = (rule, value, callback) => {
  if (passwordStrength.value < 2) {
    callback(new Error('密码强度不足，请满足至少2项要求'))
  } else {
    callback()
  }
}

const validateConfirm = (rule, value, callback) => {
  if (value !== passwordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

// ==================== 事件处理 ====================
const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    })
  } else if (command === 'password') {
    passwordDialogVisible.value = true
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } else if (command === 'profile') {
    profileDialogVisible.value = true
    profileForm.value = { ...user.value }
  }
}

const saveProfile = async () => {
  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  try {
    await api.put('/auth/profile', {
      name: profileForm.value.name,
      department: profileForm.value.department
    })
    // 更新本地存储
    user.value = { ...user.value, ...profileForm.value }
    localStorage.setItem('user', JSON.stringify(user.value))
    ElMessage.success('个人信息更新成功')
    profileDialogVisible.value = false
  } catch (e) {
    ElMessage.error('更新失败')
  }
}

const changePassword = async () => {
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/auth/change-password', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    passwordDialogVisible.value = false
    // 退出登录
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  } catch (e) {
    // 错误已在拦截器处理
  }
}

onMounted(async () => {
  // 获取科室列表
  try {
    const depts = await api.get('/equipment/options/departments')
    if (depts.length) departments.value = depts
  } catch (e) {}
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  width: 100vw;
}

.header {
  display: flex;
  align-items: center;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--medical-primary);
  white-space: nowrap;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.4);
}

.nav-menu {
  flex: 1;
  margin-left: 40px;
  border-bottom: none;
}

.nav-menu .el-menu-item {
  font-size: 15px;
}

.nav-menu .el-menu-item.is-active {
  color: var(--medical-primary);
  background: var(--medical-bg);
  border-radius: 8px;
}

.user-info {
  margin-left: auto;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.user-dropdown:hover {
  background: var(--medical-bg);
}

.username {
  font-size: 14px;
  color: var(--medical-text);
  font-weight: 500;
}

.main-content {
  padding: 0;
  background: var(--medical-bg);
  overflow: hidden;
}

/* 密码强度条 */
.password-strength-bar {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.strength-item {
  flex: 1;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  transition: all 0.3s;
}

.strength-item.active:nth-child(1) { background: #ef4444; }
.strength-item.active:nth-child(2) { background: #f59e0b; }
.strength-item.active:nth-child(3) { background: #10b981; }
.strength-item.active:nth-child(4) { background: #0d9488; }

.password-hint {
  font-size: 12px;
  margin-top: 4px;
}

.password-hint.weak { color: #ef4444; }
.password-hint.medium { color: #f59e0b; }
.password-hint.good { color: #10b981; }
.password-hint.strong { color: #0d9488; }

/* 密码要求提示 */
.password-tips {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 16px;
}

.password-tips p {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.password-tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.password-tips li {
  font-size: 12px;
  color: #94a3b8;
  padding: 4px 0;
  padding-left: 20px;
  position: relative;
}

.password-tips li::before {
  content: '○';
  position: absolute;
  left: 0;
  color: #cbd5e1;
}

.password-tips li.valid {
  color: #10b981;
}

.password-tips li.valid::before {
  content: '✓';
  color: #10b981;
}
</style>
