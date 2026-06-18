import { useEffect, useState } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { postAdminLogin } from '@/api/admin'
import { isAdminLoggedIn, setAdminProfile, setAdminToken } from '@/utils/auth'
import './login.scss'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdminLoggedIn()) {
      void Taro.reLaunch({ url: '/pages/admin/dashboard' })
    }
  }, [])

  const onSubmit = async () => {
    if (!username.trim() || !password) {
      Taro.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await postAdminLogin(username.trim(), password)
      setAdminToken(res.token)
      setAdminProfile(res.admin)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        void Taro.reLaunch({ url: '/pages/admin/dashboard' })
      }, 500)
    } catch (err: unknown) {
      Taro.showToast({ title: err instanceof Error ? err.message : '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='admin-login-page'>
      <View className='back-btn' onClick={() => Taro.navigateBack()}>
        <Text>返回登录首页</Text>
      </View>

      <View className='hero-card'>
        <Text className='hero-title'>管理端登录</Text>
        <Text className='hero-subtitle'>使用管理员账号在小程序移动端直接登录，进入内容管理与数据总览。</Text>
      </View>

      <View className='form-card'>
        <Text className='label'>管理员账号</Text>
        <Input className='field-input' value={username} placeholder='请输入管理员用户名' onInput={(e) => setUsername(e.detail.value)} />

        <Text className='label'>登录密码</Text>
        <Input className='field-input' password value={password} placeholder='请输入密码' onInput={(e) => setPassword(e.detail.value)} />

        <Text className='helper-text'>登录接口为 `/api/v1/admin/auth/login`，成功后将进入小程序管理首页。</Text>
      </View>

      <Button type='primary' className='submit-btn' loading={loading} disabled={!username.trim() || !password} onClick={onSubmit}>
        登录管理端
      </Button>
    </View>
  )
}
