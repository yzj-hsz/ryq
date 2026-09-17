import { useState } from 'react'
import { View, Text, Image, ScrollView, RichText } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchExperienceDetail } from '@/api/services'
import { formatUrl } from '@/utils/url'
import './detail-page.scss'

export default function ExperienceDetailPage() {
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useLoad(() => {
    const id = Number(router.params.id)
    if (!id) return
    fetchExperienceDetail(id).then(setData).catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
  })

  if (!data) {
    return (
      <View className='exp-detail-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='exp-detail-page'>
      <Text className='exp-detail-back' onClick={() => Taro.navigateBack()}>返回</Text>
      <ScrollView scrollY className='exp-detail-scroll'>
        <Image className='exp-detail-cover' src={formatUrl(String(data.cover_url || ''))} mode='aspectFill' />
        <View className='exp-detail-body'>
          <Text className='exp-detail-title'>{String(data.name || '')}</Text>
          <Text className='exp-detail-meta'>地点：{String(data.location || '')} · 时长：{String(data.duration_note || '')}</Text>
          <Text className='exp-detail-summary'>{String(data.summary || '')}</Text>
          {Boolean(data.flow_text) && <View className='exp-detail-card'><Text className='exp-detail-card-title'>体验流程</Text><Text>{String(data.flow_text)}</Text></View>}
          {Boolean(data.value_text) && <View className='exp-detail-card'><Text className='exp-detail-card-title'>非遗价值</Text><Text>{String(data.value_text)}</Text></View>}
          {Boolean(data.notice_html) && <View className='exp-detail-card'><RichText className='exp-detail-rich-content' nodes={String(data.notice_html)} /></View>}
        </View>
      </ScrollView>
    </View>
  )
}
