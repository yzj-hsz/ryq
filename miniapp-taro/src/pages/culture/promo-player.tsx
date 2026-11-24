import { useState } from 'react'
import { View, Text, Video } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { navigateBackOrRelaunch } from '@/utils/navigation'
import './promo-player.scss'

export default function PromoPlayerPage() {
  const [title, setTitle] = useState('认识饶平')
  const [videoUrl, setVideoUrl] = useState('')
  const [posterUrl, setPosterUrl] = useState('')

  useLoad((params) => {
    setTitle(params?.title ? decodeURIComponent(params.title) : '认识饶平')
    setVideoUrl(params?.video ? decodeURIComponent(params.video) : '')
    setPosterUrl(params?.poster ? decodeURIComponent(params.poster) : '')
  })

  return (
    <View className='promo-player-page'>
      <View className='promo-player-bar'>
        <Text className='promo-player-back' onClick={() => navigateBackOrRelaunch()}>返回</Text>
        <Text className='promo-player-title'>{title}</Text>
      </View>

      <View className='promo-player-body'>
        {videoUrl ? (
          <Video
            className='promo-player-video'
            src={videoUrl}
            poster={posterUrl}
            controls
            autoplay
            direction={0}
            showCenterPlayBtn
            showProgress
            objectFit='contain'
            onError={() => {
              Taro.showToast({ title: '视频加载失败', icon: 'none' })
            }}
          />
        ) : (
          <View className='promo-player-empty'>
            <Text>当前暂无可播放视频</Text>
          </View>
        )}

        <Text className='promo-player-tip'>当前页面仅提供普通播放，如需退出请点击左上角返回。</Text>
      </View>
    </View>
  )
}
