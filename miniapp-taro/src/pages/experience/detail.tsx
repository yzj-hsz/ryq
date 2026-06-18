import { useState } from 'react'
import { View, Text, Image, ScrollView, RichText } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchExperienceDetail } from '@/api/services'
import { formatUrl } from '@/utils/url'
import './detail.scss'

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
      <View className='sub-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='sub-page'>
      <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
      <ScrollView scrollY className='scroll'>
        <Image className='cover' src={formatUrl(String(data.cover_url || ''))} mode='aspectFill' />
        <View className='body'>
          <Text className='title'>{String(data.name || '')}</Text>
          <Text className='meta'>地点：{String(data.location || '')} · 时长：{String(data.duration_note || '')}</Text>
          <Text className='summary'>{String(data.summary || '')}</Text>
          {Boolean(data.flow_text) && <View className='card'><Text className='ch'>体验流程</Text><Text>{String(data.flow_text)}</Text></View>}
          {Boolean(data.value_text) && <View className='card'><Text className='ch'>非遗价值</Text><Text>{String(data.value_text)}</Text></View>}
          {Boolean(data.notice_html) && <View className='card'><RichText nodes={String(data.notice_html)} /></View>}
        </View>
      </ScrollView>
    </View>
  )
}
