import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { deleteMyGiftBox, fetchMyGiftBoxes } from '@/api/services'
import type { SavedGiftBox } from '@/api/services'
import './mine.scss'

const BOX_LABEL: Record<string, string> = { square: '方形礼盒', circle: '圆形礼盒' }

export default function MyGiftBoxPage() {
  const [items, setItems] = useState<SavedGiftBox[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchMyGiftBoxes()
      setItems(res.items || [])
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void load()
  })

  const onDelete = async (e: any, id: number) => {
    e.stopPropagation()
    const confirm = await Taro.showModal({ title: '删除确认', content: '确定删除这个礼盒吗？' })
    if (!confirm.confirm) return
    try {
      await deleteMyGiftBox(id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      void load()
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  return (
    <View className='mine-page'>
      <View className='mine-topbar'>
        <Text className='back active-scale' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='mine-title'>我的礼盒</Text>
        <Text
          className='new-btn'
          onClick={() => Taro.navigateTo({ url: '/pages/giftbox/select' })}
        >
          去选配
        </Text>
      </View>
      <ScrollView scrollY className='mine-list'>
        {loading && <Text className='mine-hint'>加载中...</Text>}
        {!loading && items.length === 0 && (
          <Text className='mine-hint'>还没有保存的礼盒，去选配一个吧</Text>
        )}
        {items.map((item) => (
          <View
            key={item.id}
            className='mine-card'
            onClick={() => Taro.navigateTo({ url: `/pages/giftbox/detail?id=${item.id}` })}
          >
            <View className='mine-card-top'>
              <Text className='mine-name'>{item.box_name || '定制礼盒'}</Text>
              <Text className='mine-total'>¥{item.total_price}</Text>
            </View>
            <Text className='mine-meta'>
              {BOX_LABEL[item.box_type] ?? item.box_type} · {item.items.length}件商品 · 包装费¥{item.packing_fee}
            </Text>
            <Text className='mine-goods'>
              {item.items.map((g) => g.name).join('、') || '空盒'}
            </Text>
            <View className='mine-foot'>
              <Text className='mine-date'>{item.created_at?.split('T')[0] ?? ''}</Text>
              <Text className='mine-del' onClick={(e) => onDelete(e, item.id)}>删除</Text>
            </View>
          </View>
        ))}
        <View className='list-pad' />
      </ScrollView>
    </View>
  )
}
