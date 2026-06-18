import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchCulturePromo, fetchCultureArticles } from '@/api/services'
import type { CultureArticle } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './KnowTab.scss'

interface Props {
  active: boolean
}

export default function KnowTab({ active }: Props) {
  const [promo, setPromo] = useState({ title: '', cover_url: '', video_url: null as string | null })
  const [articles, setArticles] = useState<CultureArticle[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadData = async (force = false) => {
    if (loaded && !force) return

    try {
      const promoRes = await fetchCulturePromo()
      setPromo({ title: promoRes.title, cover_url: promoRes.cover_url, video_url: promoRes.video_url })
      const articlesRes = await fetchCultureArticles()
      setArticles(articlesRes.items)
      setLoaded(true)
    } catch {
      Taro.showToast({ title: '内容加载失败', icon: 'none' })
    }
  }

  useEffect(() => {
    if (active) {
      void loadData()
    }
  }, [active])

  return (
    <ScrollView scrollY className='tab-scroll know-tab' showScrollbar={false}>
      <View className='rz-header'>
        <Text className='rz-title'>认识饶平</Text>
        <Text className='rz-sub'>沉浸式视频与图文，感受饶平山海人文与非遗魅力。</Text>
      </View>
      <View className='video-card'>
        <View className='v-head'>
          <View className='v-icon'>视</View>
          <View>
            <Text className='v-title'>{promo.title || '饶平宣传视频'}</Text>
            <Text className='v-tip'>全景展示饶平非遗与山海风貌</Text>
          </View>
        </View>
        <Image className='v-cover' src={formatUrl(promo.cover_url)} mode='aspectFill' />
      </View>
      <View className='section-title'>
        <Text className='t'>饶平文化图文介绍</Text>
      </View>
      <View className='article-list'>
        {articles.map((article) => (
          <View key={article.id} className='rz-card' onClick={() => Taro.navigateTo({ url: `/pages/culture/detail?id=${article.id}` })}>
            <View className='rz-img-wrap'>
              <Image className='rz-img' src={formatUrl(article.cover_url)} mode='aspectFill' />
              {article.list_no != null && <Text className='rz-num'>{article.list_no}</Text>}
            </View>
            <View className='rz-body'>
              <Text className='rz-h4'>{article.title}</Text>
              <Text className='rz-p'>{article.summary}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className='bottom-pad' />
    </ScrollView>
  )
}
