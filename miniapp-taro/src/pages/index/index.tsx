import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import FloatBottomNav from '@/components/FloatBottomNav'
import HomeTab from '@/components/tabs/HomeTab'
import CultureTab from '@/components/tabs/CultureTab'
import PlayTab from '@/components/tabs/PlayTab'
import KnowTab from '@/components/tabs/KnowTab'
import ProfileTab from '@/components/tabs/ProfileTab'
import { postAnalyticsEvent } from '@/api/services'
import { isLoggedIn } from '@/utils/auth'
import './index.scss'

export default function IndexPage() {
  const [tab, setTab] = useState(0)
  const [cultureCat, setCultureCat] = useState('all')
  const [statusPad, setStatusPad] = useState(20)

  const onSwitchTab = (index: number, cat?: string) => {
    setTab(index)
    if (index === 1 && cat) {
      setCultureCat(cat)
    }
  }

  useDidShow(() => {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: '/pages/login/login' })
      return
    }
    void postAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/pages/index/index',
      meta: { tab },
    }).catch(() => {})
    try {
      const sys = Taro.getSystemInfoSync()
      setStatusPad(sys.statusBarHeight || 20)
    } catch {
      setStatusPad(24)
    }
  })

  return (
    <View className='shell' style={{ paddingTop: `${statusPad}px` }}>
      <View className='body'>
        {tab === 0 && <HomeTab active onSwitchTab={onSwitchTab} />}
        {tab === 1 && <CultureTab active initialCategory={cultureCat} />}
        {tab === 2 && <PlayTab active />}
        {tab === 3 && <KnowTab active />}
        {tab === 4 && <ProfileTab active />}
      </View>
      <FloatBottomNav current={tab} onChange={setTab} />
    </View>
  )
}

