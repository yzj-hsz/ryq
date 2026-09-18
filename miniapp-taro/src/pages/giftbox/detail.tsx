import { useState } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { deleteMyGiftBox, fetchMyGiftBoxDetail } from '@/api/services'
import type { SavedGiftBox } from '@/api/services'
import './detail.scss'

const GRID = 3
const BOX_LABEL: Record<string, string> = { square: '方形礼盒', circle: '圆形礼盒' }

export default function SavedGiftBoxDetailPage() {
  const router = useRouter()
  const [statusPad, setStatusPad] = useState(20)
  const [item, setItem] = useState<SavedGiftBox | null>(null)

  useLoad(() => {
    setStatusPad(Taro.getSystemInfoSync().statusBarHeight || 20)
    const id = Number(router.params.id)
    if (!id) return
    fetchMyGiftBoxDetail(id)
      .then(setItem)
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
  })

  const onDelete = async () => {
    if (!item) return
    const confirm = await Taro.showModal({ title: '删除确认', content: '确定删除这个礼盒吗？' })
    if (!confirm.confirm) return
    try {
      await deleteMyGiftBox(item.id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  if (!item) {
    return (
      <View className='saved-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  const isCircle = item.box_type === 'circle'
  return (
    <View className='saved-page' style={{ paddingTop: `${statusPad}px` }}>
      <View className='saved-topbar'>
        <Text className='back active-scale' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='saved-title'>{item.box_name || '定制礼盒'}</Text>
        <Text className='saved-total'>¥{item.total_price}</Text>
      </View>
      <ScrollView scrollY className='saved-scroll'>
        <View className='saved-meta-card'>
          <Text className='saved-meta'>形状：{BOX_LABEL[item.box_type] ?? item.box_type}</Text>
          <Text className='saved-meta'>包装费：¥{item.packing_fee}</Text>
          <Text className='saved-meta'>保存时间：{item.created_at?.replace('T', ' ').slice(0, 16) ?? '-'}</Text>
        </View>
        {/* 摆放快照：只读网格还原 */}
        <View className={`saved-box ${isCircle ? 'circle' : 'square'}`}>
          <View className='saved-grid-bg'>
            {Array.from({ length: GRID * GRID }).map((_, i) => (
              <View key={i} className='saved-cell' />
            ))}
          </View>
          <View className='saved-layer'>
            {item.items.map((g, index) => (
              <View
                key={index}
                className='saved-block'
                style={{
                  left: `${(g.x / GRID) * 100}%`,
                  top: `${(g.y / GRID) * 100}%`,
                  width: `${(g.w / GRID) * 100}%`,
                  height: `${(g.h / GRID) * 100}%`,
                }}
              >
                <View className='saved-block-inner'>
                  <Text className='saved-block-name'>{g.name}</Text>
                  <Text className='saved-block-size'>{g.w}×{g.h}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View className='saved-meta-card'>
          <Text className='saved-card-title'>盒内商品（{item.items.length}件）</Text>
          {item.items.map((g, index) => (
            <View key={index} className='saved-goods-row'>
              <Text className='saved-goods-name'>{g.name}（{g.w}×{g.h}）</Text>
              <Text className='saved-goods-price'>¥{g.price}</Text>
            </View>
          ))}
          <View className='saved-goods-row total'>
            <Text className='saved-goods-name'>预计总价（含包装费）</Text>
            <Text className='saved-goods-price big'>¥{item.total_price}</Text>
          </View>
        </View>
        <Button className='saved-del-btn' onClick={onDelete}>删除该礼盒</Button>
        <View className='list-pad' />
      </ScrollView>
    </View>
  )
}
