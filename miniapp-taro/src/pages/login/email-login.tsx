import { useMemo, useState } from 'react'
import { View, Text, Image, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { postSendCode, postEmailLogin, postGuestLogin } from '@/api/auth'
import { setToken } from '@/utils/auth'
import './email-login.scss'

const LOGO = '/assets/login-logo.jpg'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailLoginPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const emailValid = useMemo(() => EMAIL_RE.test(normalizedEmail), [normalizedEmail])
  const canSubmit = emailValid && code.trim().length >= 4

  const onSendCode = async () => {
    if (!emailValid) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }

    try {
      await postSendCode(normalizedEmail)
      Taro.showToast({ title: '验证码已发送至邮箱', icon: 'success' })
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((current) => {
          if (current <= 1) {
            clearInterval(timer)
            return 0
          }
          return current - 1
        })
      }, 1000)
    } catch (err: unknown) {
      Taro.showToast({ title: err instanceof Error ? err.message : '发送失败', icon: 'none' })
    }
  }

  const onSubmit = async () => {
    if (!normalizedEmail) {
      Taro.showToast({ title: '请输入邮箱', icon: 'none' })
      return
    }
    if (!emailValid) {
      Taro.showToast({ title: '邮箱格式不正确', icon: 'none' })
      return
    }
    if (code.trim().length < 4) {
      Taro.showToast({ title: '请输入正确的验证码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await postEmailLogin(normalizedEmail, code.trim(), username.trim())
      setToken(res.token)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
      }, 600)
    } catch (err: unknown) {
      Taro.showToast({ title: err instanceof Error ? err.message : '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const onGuestLogin = async () => {
    Taro.showLoading({ title: '正在登录...' })
    try {
      const res = await postGuestLogin()
      setToken(res.token)
      Taro.showToast({ title: '访客登录成功', icon: 'success' })
      setTimeout(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
      }, 600)
    } catch {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  return (
    <View className='email-login-page'>
      <View className='back-btn' onClick={() => Taro.navigateBack()}>
        <Text>返回</Text>
      </View>

      <View className='brand-block'>
        <Image className='logo' src={LOGO} mode='aspectFit' />
        <Text className='slogan-main'>邮箱登录 / 注册</Text>
        <Text className='slogan-sub'>使用邮箱验证码登录，首次登录将自动创建账号</Text>
      </View>

      <View className='form-container'>
        <Text className='label'>用户名</Text>
        <Input className='field-input' value={username} placeholder='未注册时生效' onInput={(e) => setUsername(e.detail.value)} />

        <Text className='label'>邮箱</Text>
        <Input
          className='field-input'
          type='text'
          value={email}
          placeholder='请输入邮箱'
          placeholderClass='field-placeholder'
          onInput={(e) => setEmail(e.detail.value)}
          onBlur={() => setEmail(normalizedEmail)}
        />

        <View className='code-row'>
          <View className='code-input-wrap'>
            <Input className='field-input code-input' type='number' value={code} placeholder='验证码' onInput={(e) => setCode(e.detail.value)} />
          </View>
          <View className='code-actions'>
            <Button className='code-btn' disabled={countdown > 0 || !emailValid} onClick={onSendCode}>
              {countdown > 0 ? `${countdown}s后重发` : '发送验证码'}
            </Button>
          </View>
        </View>

        <Text className='helper-text'>验证码 5 分钟内有效，请留意邮箱收件箱和垃圾邮件箱</Text>
      </View>

      <Button type='primary' className='btn-main' loading={loading} disabled={!canSubmit} onClick={onSubmit}>
        登录 / 注册
      </Button>

      <View className='guest-link-wrap' onClick={onGuestLogin}>
        <Text className='guest-link'>访客身份直接进入</Text>
      </View>
    </View>
  )
}
