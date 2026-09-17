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
  const [roleToken, setRoleToken] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const emailValid = useMemo(() => EMAIL_RE.test(normalizedEmail), [normalizedEmail])
  const isAdminRoleToken = useMemo(() => roleToken.trim().toUpperCase().startsWith('RYQ-ADMIN'), [roleToken])
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
    if (isAdminRoleToken && !adminPassword.trim()) {
      Taro.showToast({ title: '请设置管理端登录密码', icon: 'none' })
      return
    }
    if (isAdminRoleToken && adminPassword !== confirmAdminPassword) {
      Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await postEmailLogin(
        normalizedEmail,
        code.trim(),
        username.trim(),
        roleToken.trim(),
        adminPassword.trim() || undefined
      )
      setToken(res.token)
      Taro.showToast({
        title: isAdminRoleToken ? '管理员已开通' : '登录成功',
        icon: 'success',
      })
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

        <Text className='label'>角色令牌</Text>
        <Input
          className='field-input'
          type='text'
          value={roleToken}
          placeholder='选填，输入工作人员或管理员令牌'
          placeholderClass='field-placeholder'
          onInput={(e) => setRoleToken(e.detail.value)}
        />
        {isAdminRoleToken && (
          <>
            <Text className='label'>管理端密码</Text>
            <Input
              className='field-input'
              password
              value={adminPassword}
              placeholder='首次成为管理员时必填'
              placeholderClass='field-placeholder'
              onInput={(e) => setAdminPassword(e.detail.value)}
            />

            <Text className='label'>确认密码</Text>
            <Input
              className='field-input'
              password
              value={confirmAdminPassword}
              placeholder='请再次输入管理端密码'
              placeholderClass='field-placeholder'
              onInput={(e) => setConfirmAdminPassword(e.detail.value)}
            />
            <Text className='helper-text token-helper'>使用管理员令牌登录后，会同步创建管理端账号，后续可用当前用户名和此密码直接登录管理端。</Text>
          </>
        )}

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
        <Text className='helper-text token-helper'>填写有效令牌后，登录成功会自动成为对应的工作人员或管理员；管理员令牌支持同时设置管理端登录密码；令牌 10 小时内可重复用于批量注册。</Text>
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
