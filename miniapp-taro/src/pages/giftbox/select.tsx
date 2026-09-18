import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchGiftBoxes, postAnalyticsEvent } from '@/api/services'
import type { GiftBoxBrief } from '@/api/services'
import './select.scss'

const BOX_LABEL: Record<string, string> = { square: '方形', circle: '圆形' }

export default function GiftBoxSelectPage() {
  const [boxes, setBoxes] = useState<GiftBoxBrief[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchGiftBoxes()
      setBoxes(res.items || [])
      void postAnalyticsEvent({ event_type: 'page_view', page_path: '/pages/giftbox/select' }).catch(() => {})
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void load()
  })

  return (
    <View className='select-page'>
      <View className='select-topbar'>
        <Text className='back active-scale' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='select-title'>选择礼盒</Text>
        <Text className='select-count'>{boxes.length}款</Text>
      </View>
      <ScrollView scrollY className='select-list'>
        {loading && <Text className='select-hint'>加载中...</Text>}
        {!loading && boxes.length === 0 && (
          <Text className='select-hint'>暂无可选礼盒，请联系管理员上架</Text>
        )}
        {boxes.map((box) => (
          <View
            key={box.id}
            className='box-card'
            onClick={() => Taro.navigateTo({ url: `/pages/giftbox/custom?box_id=${box.id}` })}
          >
            <View className={`box-shape ${box.box_type}`}>
              <Text className='box-shape-text'>{BOX_LABEL[box.box_type] ?? box.box_type}</Text>
            </View>
            <View className='box-info'>
              <Text className='box-name'>{box.name}</Text>
              <Text className='box-desc'>形状：{BOX_LABEL[box.box_type] ?? box.box_type}</Text>
              <Text className='box-desc'>包装费：¥{box.packing_fee}</Text>
              <Text className='box-desc'>起售价：¥{box.min_price}（含包装费）</Text>
            </View>
            <Text className='box-go'>选配 ›</Text>
          </View>
        ))}
        <View className='list-pad' />
      </ScrollView>
    </View>
  )
}
