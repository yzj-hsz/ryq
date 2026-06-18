import { useState } from 'react'
import { View, Text, Image, ScrollView, RichText } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchCultureArticleDetail } from '@/api/services'
import { formatUrl } from '@/utils/url'
import './detail.scss'

export default function CultureDetailPage() {
  const router = useRouter()
  const [article, setArticle] = useState<{ title: string; cover_url: string; summary: string; body_html: string } | null>(null)

  useLoad(() => {
    const id = Number(router.params.id)
    if (!id) return
    fetchCultureArticleDetail(id).then(setArticle).catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
  })

  if (!article) {
    return (
      <View className='sub-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='sub-page'>
      <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
      <ScrollView scrollY>
        <Image className='cover' src={formatUrl(article.cover_url)} mode='aspectFill' />
        <View className='body'>
          <Text className='title'>{article.title}</Text>
          <Text className='summary'>{article.summary}</Text>
          <RichText nodes={article.body_html} />
        </View>
      </ScrollView>
    </View>
  )
}
