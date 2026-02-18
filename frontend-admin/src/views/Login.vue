<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-logo">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M2 12h20" stroke-linecap="round"/>
          </svg>
        </div>
        <h1>医疗设备全周期管理平台</h1>
        <p>Medical Equipment Lifecycle Management</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-tips">
        <p>测试账号：admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = ref({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await api.post('/auth/login', form.value)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 登录页面容器 - 医疗主题渐变背景 */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 - 医疗元素 */
.login-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
    radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 30%);
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-2%, -2%) rotate(1deg); }
}

/* 登录框 */
.login-box {
  background: white;
  border-radius: 20px;
  padding: 48px 40px;
  width: 420px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

/* Logo区域 */
.login-logo {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo .icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 10px 30px -10px rgba(13, 148, 136, 0.5);
}

.login-logo .icon svg {
  width: 48px;
  height: 48px;
  color: white;
}

.login-logo h1 {
  font-size: 22px;
  color: #1e293b;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-logo p {
  font-size: 13px;
  color: #64748b;
  letter-spacing: 1px;
}

/* 表单样式 */
.login-box :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-box :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e2e8f0;
  padding: 4px 12px;
  transition: all 0.3s;
}

.login-box :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #0d9488;
}

.login-box :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2), 0 0 0 1px #0d9488;
}

.login-box :deep(.el-input__inner) {
  height: 44px;
  font-size: 15px;
}

.login-box :deep(.el-button--primary) {
  height: 48px;
  font-size: 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border: none;
  box-shadow: 0 4px 15px -3px rgba(13, 148, 136, 0.4);
  transition: all 0.3s;
}

.login-box :deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(13, 148, 136, 0.5);
}

.login-box :deep(.el-button--primary:active) {
  transform: translateY(0);
}

/* 提示信息 */
.login-tips {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.login-tips p {
  color: #64748b;
  font-size: 13px;
  background: #f8fafc;
  padding: 10px 16px;
  border-radius: 8px;
  display: inline-block;
}

/* 密码强度提示 */
.password-strength {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.password-strength .bar {
  flex: 1;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  transition: all 0.3s;
}

.password-strength.weak .bar:nth-child(1) { background: #ef4444; }
.password-strength.medium .bar:nth-child(1),
.password-strength.medium .bar:nth-child(2) { background: #f59e0b; }
.password-strength.strong .bar { background: #10b981; }

/* 响应式 */
@media (max-width: 480px) {
  .login-box {
    width: 90%;
    padding: 32px 24px;
    margin: 20px;
  }
  
  .login-logo h1 {
    font-size: 18px;
  }
}
</style>
