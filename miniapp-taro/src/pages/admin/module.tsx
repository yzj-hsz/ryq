import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { usePullDownRefresh, useRouter } from '@tarojs/taro'
import { isAdminLoggedIn } from '@/utils/auth'
import { MENU_LABELS, SectionRenderer, type MenuKey } from './sections'
import { navigateBackOrRelaunch } from '@/utils/navigation'
import './dashboard.scss'

const VALID_KEYS = Object.keys(MENU_LABELS) as MenuKey[]

/**
 * 管理端功能专属页面：通过路由参数 key 渲染不同功能模块，
 * 顶部提供【返回】按钮回到管理首页，重新选择其他功能菜单。
 */
export default function AdminModulePage() {
  const router = useRouter()
  const rawKey = String(router.params.key || '')
  const activeMenu: MenuKey = VALID_KEYS.indexOf(rawKey as MenuKey) >= 0 ? (rawKey as MenuKey) : 'dashboard'
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      Taro.reLaunch({ url: '/pages/admin/login' })
    }
  }, [])

  usePullDownRefresh(() => {
    setRefreshTick((tick) => tick + 1)
  })

  const goHome = () => {
    navigateBackOrRelaunch('/pages/admin/dashboard')
  }

  const onJump = (key: MenuKey) => {
    Taro.redirectTo({ url: `/pages/admin/module?key=${key}` })
  }

  return (
    <View className='admin-dashboard-page admin-module-page'>
      <View className='module-topbar'>
        <View className='admin-back-btn' onClick={goHome}>
          <Text className='admin-back-btn-text'>返回</Text>
        </View>
        <Text className='module-topbar-title'>{MENU_LABELS[activeMenu]}</Text>
      </View>
      <SectionRenderer activeMenu={activeMenu} refreshTick={refreshTick} onJump={onJump} />
    </View>
  )
}
