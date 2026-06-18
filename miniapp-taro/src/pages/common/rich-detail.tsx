import { useState } from 'react'
import { View, Text, ScrollView, RichText, Image } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchBannerDetail, fetchHighlightDetail } from '@/api/services'
import { formatUrl } from '@/utils/url'
import './rich-detail.scss'

export default function RichDetailPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [html, setHtml] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useLoad(() => {
    void (async () => {
      const type = router.params.type
      const id = Number(router.params.id)
      if (!id) return

      try {
        if (type === 'banner') {
          const banner = await fetchBannerDetail(id)
          setTitle(banner.title)
          setImageUrl(banner.image_url || '')
          setHtml(banner.detail_html)
        } else {
          const highlight = await fetchHighlightDetail(id)
          setTitle(highlight.title)
          setImageUrl(highlight.image_url || '')
          setHtml(highlight.detail_html)
        }
      } catch {
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
    })()
  })

  return (
    <View className='rich-page'>
      <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
      <ScrollView scrollY className='scroll'>
        <Text className='title'>{title}</Text>
        {imageUrl ? <Image className='hero-image' src={formatUrl(imageUrl)} mode='widthFix' /> : null}
        <RichText nodes={html} />
      </ScrollView>
    </View>
  )
}
