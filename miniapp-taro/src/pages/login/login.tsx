import { useMemo, useState } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { postWechatLogin, fetchMe, postGuestLogin, type AuthUser } from '@/api/auth'
import { clearToken, isAdminLoggedIn, isLoggedIn, setToken } from '@/utils/auth'
import './login.scss'

const LOGO = '/assets/login-logo.jpg'

export default function LoginPage() {
  const [wxLoading, setWxLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const router = useRouter()
  const forceShowLogin = router.params.from === 'guest'

  const userLabel = useMemo(() => {
    if (!user) return ''
    const email = user.email
    const maskedEmail = email
      ? email.includes('@')
        ? `${email.split('@')[0].slice(0, 2)}***@${email.split('@')[1]}`
        : email
      : '未绑定邮箱'

    return `${user.username} · ${maskedEmail}`
  }, [user])

  useDidShow(() => {
    void (async () => {
      if (forceShowLogin) {
        return
      }
      if (isAdminLoggedIn()) {
        await Taro.reLaunch({ url: '/pages/admin/dashboard' })
        return
      }
      if (!isLoggedIn()) return

      try {
        const me = await fetchMe()
        setUser(me)
        await Taro.reLaunch({ url: '/pages/index/index' })
      } catch {
        clearToken()
      }
    })()
  })

  const ensureAgreed = () => {
    if (agreed) return true
    Taro.showToast({ title: '请先阅读并同意协议', icon: 'none' })
    return false
  }

  const onWechatLogin = async () => {
    if (!ensureAgreed()) return

    setWxLoading(true)
    try {
      const loginRes = await Taro.login()
      if (!loginRes.code) {
        Taro.showToast({ title: '未获取到登录 code', icon: 'none' })
        return
      }

      const res = await postWechatLogin(loginRes.code)
      setToken(res.token)
      setUser(res.user)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
      }, 600)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setWxLoading(false)
    }
  }

  const onGuestLogin = async () => {
    if (!ensureAgreed()) return

    Taro.showLoading({ title: '正在登录...' })
    try {
      const res = await postGuestLogin()
      setToken(res.token)
      setUser(res.user)
      Taro.showToast({ title: '访客登录成功', icon: 'success' })
      setTimeout(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
      }, 600)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const onLogoutCurrentAccount = () => {
    clearToken()
    setUser(null)
    Taro.showToast({ title: '已退出登录', icon: 'success' })
  }

  return (
    <View className='login-page'>
      <View className='help-row'>
        <Text
          className='help-link'
          onClick={() =>
            Taro.showModal({
              title: '饶有趣',
              content: '1.0 纯展示公益平台，欢迎体验本地文化内容。',
              showCancel: false,
            })
          }
        >
          帮助
        </Text>
      </View>

      <View className='brand-block'>
        <Image className='logo' src={LOGO} mode='aspectFit' />
        <View className='slogan'>
          <Text className='slogan-main'>登录饶有趣</Text>
          <Text className='slogan-accent'>可享更多文化内容</Text>
        </View>
        <Text className='slogan-sub'>用户登录与管理端登录都从这里进入</Text>
      </View>

      <Button
        type='primary'
        className='btn-main'
        loading={wxLoading}
        disabled={!agreed}
        onClick={onWechatLogin}
      >
        同意协议并微信号一键登录
      </Button>

      <Button type='default' className='btn-guest' disabled={!agreed} onClick={onGuestLogin}>
        以访客身份进入（无需登录）
      </Button>

      <View className='terms' onClick={() => setAgreed((value) => !value)}>
        <View className={`check-icon ${agreed ? 'checked' : ''}`}>
          <Text className='check-icon-text'>{agreed ? '√' : ''}</Text>
        </View>
        <Text className='terms-text'>
          未注册邮箱将自动注册。登录即表示您已阅读并同意《用户服务协议》与《隐私政策》。 
        </Text>
      </View>

      <View className='divider-wrap'>
        <View className='divider-line' />
        <Text className='divider-text'>其他登录方式</Text>
        <View className='divider-line' />
      </View>

      <View className='alt-row'>
        <View className='alt-item' onClick={() => Taro.navigateTo({ url: '/pages/login/email-login' })}>
          <View className='alt-btn alt-circle'>
            <Text className='alt-icon-mail'>@</Text>
          </View>
          <Text className='alt-label'>邮箱验证</Text>
        </View>

        <View className='alt-item' onClick={() => Taro.navigateTo({ url: '/pages/admin/login' })}>
          <View className='alt-btn alt-admin'>
            <Text className='alt-icon-admin'>管</Text>
          </View>
          <Text className='alt-label'>管理端</Text>
        </View>
      </View>

      {user && (
        <View className='footer-tip'>
          <Text className='tip'>已登录 · {userLabel}</Text>
          <View className='footer-actions'>
            <Button
              type='default'
              className='btn-enter'
              onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
            >
              进入首页
            </Button>
            <Button type='default' className='btn-logout' onClick={onLogoutCurrentAccount}>
              退出登录
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
