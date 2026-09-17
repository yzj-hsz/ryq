import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchCulturePromo, fetchCultureArticles } from '@/api/services'
import type { CultureArticle } from '@/api/types'
import EmptyState from '@/components/ui/EmptyState'
import { formatUrl } from '@/utils/url'
import './KnowTab.scss'

interface Props {
  active: boolean
}
export default function KnowTab({ active }: Props) {
  const [promo, setPromo] = useState({ title: '', cover_url: '', video_url: null as string | null })
  const [articles, setArticles] = useState<CultureArticle[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadData = async (force = false) => {
    if ((loaded && !force) || loading) return

    setLoading(true)
    try {
      const promoRes = await fetchCulturePromo()
      setPromo({ title: promoRes.title, cover_url: promoRes.cover_url, video_url: promoRes.video_url })
      const articlesRes = await fetchCultureArticles()
      setArticles(articlesRes.items)
      setLoaded(true)
    } catch {
      Taro.showToast({ title: '内容加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) {
      void loadData()
    }
  }, [active])

  const openPromoPlayer = () => {
    if (!promo.video_url) {
      Taro.showToast({ title: '当前暂无视频', icon: 'none' })
      return
    }

    const query = [
      `title=${encodeURIComponent(promo.title || '认识饶平')}`,
      `video=${encodeURIComponent(formatUrl(promo.video_url))}`,
      `poster=${encodeURIComponent(formatUrl(promo.cover_url))}`,
    ].join('&')
    Taro.navigateTo({ url: `/pages/culture/promo-player?${query}` })
  }

  return (
    <View className='know-tab-shell'>
      <View className='know-top'>
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
          <View className='v-cover-wrap'>
            <View className='v-poster-wrap' onClick={openPromoPlayer}>
              <Image className='v-cover' src={formatUrl(promo.cover_url)} mode='aspectFill' />
              <View className='v-play-mask'>
                <View className='v-play-btn'>
                  <Text className='v-play-icon'>播放</Text>
                </View>
                <Text className='v-play-tip'>点击进入播放页</Text>
              </View>
            </View>
          </View>
        </View>
        <View className='section-title'>
          <Text className='t'>饶平文化图文介绍</Text>
        </View>
      </View>
      <ScrollView scrollY className='know-article-scroll' showScrollbar={false}>
        <View className='rz-list animate-slide-up'>
          {articles.length === 0 && !loading && (
            <View className='empty-wrap'>
              <EmptyState title='暂无资讯' description='暂无相关资讯' />
            </View>
          )}
          {articles.map((article) => (
            <View key={article.id} className='rz-card active-scale' onClick={() => Taro.navigateTo({ url: `/pages/culture/detail?id=${article.id}` })}>
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
    </View>
  )
}
