import { useEffect, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, Video, ScrollView, RichText } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchHome } from '@/api/services'
import { fetchMe } from '@/api/auth'
import type { HomePayload } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './HomeTab.scss'

interface Props {
  active: boolean
  onSwitchTab: (index: number, cat?: string) => void
}

const emptyHome: HomePayload = {
  intro: { videos: [], ppts: [], text_html: '', video_cover: '', ppt_slides: [] },
  banners: [],
  highlights: [],
}

function looksLikeVideo(url: string) {
  return /\.(mp4|mov|m4v|webm)$/i.test(url)
}

export default function HomeTab({ active, onSwitchTab }: Props) {
  const [introTab, setIntroTab] = useState<'video' | 'ppt' | 'text'>('ppt')
  const [pptIndex, setPptIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [data, setData] = useState<HomePayload>(emptyHome)

  const loadData = async (force = false) => {
    if (loading) return
    if (!force && loaded && !loadError) return

    setLoading(true)
    setLoadError(false)
    try {
      const result = await fetchHome()
      setData(result)
      setLoaded(true)
    } catch {
      setLoadError(true)
      if (data.banners.length === 0) {
        Taro.showToast({ title: '首页数据加载失败', icon: 'none' })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) {
      void loadData()
    }
  }, [active])

  const onBannerTap = async (banner: HomePayload['banners'][0]) => {
    if (banner.has_detail) {
      Taro.navigateTo({ url: `/pages/common/rich-detail?type=banner&id=${banner.id}` })
      return
    }

    if (banner.link_type === 'miniprogram_page') {
      const value = banner.link_value || ''
      if (value.includes('assist/tasks') || value.includes('tools/color-card')) {
        try {
          const user = await fetchMe()
          if (value.includes('tools/color-card') && user.role === 'tourist' && user.username?.startsWith('访客')) {
            await Taro.showModal({
              title: '访客受限',
              content: '访客身份无法使用色卡 DIY 功能，请使用微信号或邮箱登录。',
              showCancel: false,
              confirmText: '我知道了',
            })
            return
          }
          if (value.includes('assist/tasks') && user.role === 'tourist') {
            await Taro.showModal({
              title: '权限受限',
              content: '任务功能仅限“工作者”或“管理员”使用，请联系管理员修改权限。',
              showCancel: false,
              confirmText: '我知道了',
            })
            return
          }
        } catch {
          // Ignore auth failures here and continue with the default navigation behavior.
        }
      }

      if (value.startsWith('/pages/')) {
        Taro.navigateTo({ url: value })
      } else if (value === 'culture') {
        onSwitchTab(1)
      } else if (value === 'play') {
        onSwitchTab(2)
      } else if (value === 'know') {
        onSwitchTab(3)
      }
    } else {
      onSwitchTab(1)
    }
  }

  return (
    <ScrollView scrollY className='tab-scroll home-tab' showScrollbar={false}>
      <View className='home-header'>
        <Text className='brand-title'>饶有趣</Text>
        <Text className='brand-sub'>非遗文化传播 · 助农助残公益展示 · 深饶文旅联动</Text>
        <View className='intro-tabs'>
          {(['video', 'ppt', 'text'] as const).map((tab) => (
            <View key={tab} className={`intro-tab ${introTab === tab ? 'active' : ''}`} onClick={() => setIntroTab(tab)}>
              {tab === 'video' ? '视频' : tab === 'ppt' ? 'PPT' : '图文'}
            </View>
          ))}
        </View>
        <View className='intro-content'>
          {loading && !loaded ? (
            <View className='loading-box'><Text>加载中...</Text></View>
          ) : loadError && !loaded ? (
            <View className='loading-box' onClick={() => loadData(true)}><Text>加载失败，点击重试</Text></View>
          ) : introTab === 'video' ? (
            data.intro.videos.length ? (
              <Swiper className='ppt-swiper' circular autoplay={false}>
                {data.intro.videos.map((video) => (
                  <SwiperItem key={video.id}>
                    {looksLikeVideo(video.video_url) ? (
                      <Video className='ppt-img' src={formatUrl(video.video_url)} poster={formatUrl(video.cover_url)} controls showCenterPlayBtn />
                    ) : (
                      <Image className='ppt-img' src={formatUrl(video.cover_url || video.video_url)} mode='aspectFit' />
                    )}
                  </SwiperItem>
                ))}
              </Swiper>
            ) : (
              <View className='ppt-empty'><Text className='empty-text'>暂无视频资源</Text></View>
            )
          ) : introTab === 'ppt' ? (
            data.intro.ppts.length ? (
              <View className='ppt-wrap'>
                <Swiper className='ppt-swiper' autoplay={data.intro.ppts.length > 1} interval={5000} duration={500} onChange={(e) => setPptIndex(e.detail.current)}>
                  {data.intro.ppts.map((ppt) => (
                    <SwiperItem key={ppt.id}>
                      <Image className='ppt-img' src={formatUrl(ppt.image_url)} mode='aspectFit' />
                    </SwiperItem>
                  ))}
                </Swiper>
                <View className='ppt-dots'>
                  {data.intro.ppts.map((_, index) => (
                    <View key={index} className={`dot ${pptIndex === index ? 'on' : ''}`} />
                  ))}
                </View>
              </View>
            ) : (
              <View className='ppt-empty'><Text className='empty-text'>暂无 PPT 资源</Text></View>
            )
          ) : (
            <View className='text-intro'>
              <RichText className='intro-rich' nodes={data.intro.text_html} />
            </View>
          )}
        </View>
      </View>

      <View className='quick-entries'>
        <View className='quick-entry' onClick={() => onSwitchTab(1)}>
          <View className='icon-wrap w1'>文</View>
          <Text className='entry-label'>饶平文创</Text>
        </View>
        <View className='quick-entry' onClick={() => onSwitchTab(3)}>
          <View className='icon-wrap w2'>知</View>
          <Text className='entry-label'>认识饶平</Text>
        </View>
        <View className='quick-entry' onClick={() => onSwitchTab(1, 'assist')}>
          <View className='icon-wrap w3'>助</View>
          <Text className='entry-label'>茶染任务</Text>
        </View>
        <View className='quick-entry' onClick={() => onSwitchTab(2)}>
          <View className='icon-wrap w4'>玩</View>
          <Text className='entry-label'>玩转饶平</Text>
        </View>
      </View>

      <View className='section-title'><Text className='t'>精选推荐</Text></View>
      {data.banners.length > 0 && (
        <View className='banner-grid'>
          {data.banners.map((banner) => (
            <View key={banner.id} className='banner-item' onClick={() => onBannerTap(banner)}>
              <Image className='banner-img' src={formatUrl(banner.image_url)} mode='aspectFill' lazyLoad />
              <View className='banner-info'><Text className='banner-title'>{banner.title}</Text></View>
            </View>
          ))}
        </View>
      )}

      <View className='section-title'><Text className='t'>项目亮点</Text></View>
      {data.highlights.length > 0 && (
        <View className='highlight-grid'>
          {data.highlights.map((highlight) => (
            <View key={highlight.id} className='h-card' onClick={() => Taro.navigateTo({ url: `/pages/common/rich-detail?type=highlight&id=${highlight.id}` })}>
              <Text className='h-icon'>{highlight.icon}</Text>
              <Text className='h-title'>{highlight.title}</Text>
              <Text className='h-sum'>{highlight.summary}</Text>
            </View>
          ))}
        </View>
      )}
      <View className='bottom-pad' />
    </ScrollView>
  )
}
