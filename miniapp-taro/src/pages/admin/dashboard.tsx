import { useEffect, useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { clearAdminProfile, clearAdminToken, getAdminProfile, isAdminLoggedIn } from '@/utils/auth'
import { menuGroups, type MenuKey } from './sections'
import './dashboard.scss'

export default function AdminDashboardPage() {
  const admin = useMemo(() => getAdminProfile(), [])
  const displayName = admin?.display_name || admin?.username || '管理员'

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      Taro.reLaunch({ url: '/pages/admin/login' })
    }
  }, [])

  usePullDownRefresh(() => {
    Taro.stopPullDownRefresh()
  })

  const onLogout = async () => {
    const res = await Taro.showModal({
      title: '退出管理端',
      content: '退出后将返回登录首页，是否继续？',
    })
    if (!res.confirm) return
    clearAdminToken()
    clearAdminProfile()
    Taro.reLaunch({ url: '/pages/login/login' })
  }

  const openModule = (key: MenuKey) => {
    Taro.navigateTo({ url: `/pages/admin/module?key=${key}` })
  }

  return (
    <View className='admin-dashboard-page'>
      <View className='hero-card'>
        <Text className='hero-title'>管理台 v1.2</Text>
        <Text className='hero-subtitle'>欢迎你，{displayName}</Text>
        <Text className='hero-desc'>点击下方任意功能菜单，进入该功能的独立管理页面。</Text>
        <View className='hero-actions'>
          <Button className='ghost-btn small-btn' onClick={onLogout}>退出登录</Button>
        </View>
      </View>
      {menuGroups.map((group) => (
        <View className='menu-group' key={group.title}>
          <Text className='menu-title'>{group.title}</Text>
          <View className='menu-grid'>
            {group.items.map((item) => (
              <View key={item.key} className='menu-card' onClick={() => openModule(item.key)}>
                <Text className='menu-card-text'>{item.label}</Text>
                <Text className='menu-card-arrow'>›</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}
