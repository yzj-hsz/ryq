import { useEffect, useRef, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchExperiences } from '@/api/services'
import type { ExperienceItem } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './PlayTab.scss'

interface Props {
  active: boolean
}

export default function PlayTab({ active }: Props) {
  const [region, setRegion] = useState<'shenzhen' | 'raoping'>('shenzhen')
  const [items, setItems] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef<Record<'shenzhen' | 'raoping', ExperienceItem[]>>({ shenzhen: [], raoping: [] })
  const loadedRef = useRef<Record<'shenzhen' | 'raoping', boolean>>({ shenzhen: false, raoping: false })
  const requestIdRef = useRef(0)

  const load = async (targetRegion: 'shenzhen' | 'raoping', force = false) => {
    if (!force && loadedRef.current[targetRegion]) {
      setItems(cacheRef.current[targetRegion])
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const res = await fetchExperiences(targetRegion)
      cacheRef.current[targetRegion] = res.items
      loadedRef.current[targetRegion] = true

      // Ignore stale responses when the user switches regions quickly.
      if (requestId === requestIdRef.current && targetRegion === region) {
        setItems(res.items)
      }
    } catch {
      Taro.showToast({ title: '体验列表加载失败', icon: 'none' })
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (active) {
      void load(region)
    }
  }, [active, region])

  return (
    <ScrollView scrollY className='tab-scroll play-tab' showScrollbar={false}>
      <View className='wz-header'>
        <Text className='wz-title'>玩转饶平</Text>
        <Text className='wz-sub'>深饶非遗文旅体验项目</Text>
        <View className='wz-tabs'>
          <View className={`wz-tab ${region === 'shenzhen' ? 'active' : ''}`} onClick={() => setRegion('shenzhen')}>
            深圳体验
          </View>
          <View className={`wz-tab ${region === 'raoping' ? 'active' : ''}`} onClick={() => setRegion('raoping')}>
            饶平体验
          </View>
        </View>
      </View>
      <View className='list'>
        {items.map((item) => (
          <View key={item.id} className='exp-card' onClick={() => Taro.navigateTo({ url: `/pages/experience/detail?id=${item.id}` })}>
            <View className='exp-img-wrap'>
              <Image className='exp-img' src={formatUrl(item.cover_url)} mode='aspectFill' />
              {item.badge && <View className='exp-badge' style={{ background: item.badge_color || '#b8763e' }}>{item.badge}</View>}
            </View>
            <View className='exp-body'>
              <Text className='exp-name'>{item.name}</Text>
              <View className='exp-meta'>
                <Text>地点：{item.location}</Text>
                <Text>时长：{item.duration_note}</Text>
              </View>
              <Text className='exp-desc'>{item.summary}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className='bottom-pad' />
    </ScrollView>
  )
}
