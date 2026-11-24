import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import './select.scss'

// 选盒页已下线：固定方形礼盒，老链接统一重定向到直接选配
export default function GiftBoxSelectPage() {
  useDidShow(() => {
    void Taro.reLaunch({ url: '/pages/giftbox/custom' })
  })

  return (
    <View className='select-page'>
      <View className='select-topbar'>
        <Text className='select-title'>正在进入方形礼盒选配...</Text>
      </View>
      <Text
        className='select-hint'
        onClick={() => Taro.reLaunch({ url: '/pages/giftbox/custom' })}
      >
        点击进入选配
      </Text>
    </View>
  )
}
