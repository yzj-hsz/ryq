import { useMemo, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView, RichText, Button } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import {
  addFavorite,
  fetchMyFavorites,
  fetchProductDetail,
  postAnalyticsEvent,
  postWantClick,
  removeFavorite,
} from '@/api/services'
import type { ProductDetail } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './detail.scss'

export default function ProductDetailPage() {
  const router = useRouter()
  const [statusPad, setStatusPad] = useState(20)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [faved, setFaved] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  useLoad(() => {
    setStatusPad(Taro.getSystemInfoSync().statusBarHeight || 20)
    const id = Number(router.params.id)
    if (!id) return
    void postAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/pages/product/detail',
      target_type: 'product',
      target_id: id,
    }).catch(() => {})
    fetchProductDetail(id).then(setProduct).catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
    // 状态持久化：进入页面读取后端收藏记录，回显爱心点亮状态
    fetchMyFavorites('product')
      .then((res) => setFaved(res.items.some((item) => item.target_id === id)))
      .catch(() => {})
  })

  const gallery = product?.gallery?.length ? product.gallery : product?.cover_url ? [{ url: product.cover_url, sort_order: 0 }] : []
  const processSteps = useMemo(
    () => (product?.process_text ? product.process_text.split(/\s*->\s*|\s*→\s*/) : []),
    [product?.process_text]
  )

  const onToggleFav = async () => {
    if (!product || favLoading) return
    setFavLoading(true)
    try {
      if (faved) {
        await removeFavorite('product', product.id)
        setFaved(false)
        Taro.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        await addFavorite('product', product.id)
        // 与原“我想要”行为一致：收藏成功同步上报埋点，后台统计不断流
        await postWantClick(product.id).catch(() => {})
        setFaved(true)
        Taro.showToast({ title: '收藏成功', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: faved ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试', icon: 'none' })
    } finally {
      setFavLoading(false)
    }
  }

  if (!product) {
    return (
      <View className='page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='page' style={{ paddingTop: `${statusPad}px` }}>
      <View className='top-bar'>
        <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
      </View>
      <ScrollView scrollY className='scroll'>
        {gallery.length > 0 && (
          <Swiper className='gallery' circular indicatorDots indicatorColor='rgba(255,255,255,0.4)' indicatorActiveColor='#e8c068'>
            {gallery.map((item, index) => (
              <SwiperItem key={index}>
                <Image className='g-img' src={formatUrl(item.url)} mode='aspectFill' />
              </SwiperItem>
            ))}
          </Swiper>
        )}
        <View className='fav-row'>
          <View className={`fav-btn ${faved ? 'on' : ''}`} onClick={onToggleFav}>
            <Text className={`fav-heart ${faved ? 'on' : ''}`}>{faved ? '♥' : '♡'}</Text>
            <Text className='fav-label'>{faved ? '已收藏' : '收藏'}</Text>
          </View>
        </View>
        <View className='pad'>
          <Text className='title'>{product.name}</Text>
          <Text className='summary'>{product.summary}</Text>
          {product.product_type === '礼盒' && (
            <View className='card gift-entry'>
              <Text className='ch'>礼盒选配</Text>
              <Text className='cp'>方形 / 圆形盒型可视化预览，自由搭配盒内好物。</Text>
              <Button
                type='primary'
                className='gift-btn'
                onClick={() => Taro.navigateTo({ url: `/pages/giftbox/custom?id=${product.id}` })}
              >
                进入礼盒详情选配
              </Button>
            </View>
          )}
          {product.origin && <View className='card'><Text className='ch'>产地溯源</Text><Text className='cp'>{product.origin}</Text></View>}
          {product.producer && <View className='card'><Text className='ch'>出品方</Text><Text className='cp'>{product.producer}</Text></View>}
          {processSteps.length > 0 && (
            <View className='card'>
              <Text className='ch'>制作流程</Text>
              <View className='flow'>
                {processSteps.map((step, index) => (
                  <Text key={index} className='flow-chip'>{step}</Text>
                ))}
              </View>
            </View>
          )}
          {product.flow_steps?.length > 0 && (
            <View className='card'>
              <Text className='ch'>工序图示</Text>
              {product.flow_steps.map((step) => (
                <View key={step.step_order} className='step'>
                  <Image className='s-img' src={formatUrl(step.image_url)} mode='widthFix' />
                  {step.caption && <Text className='s-cap'>{step.caption}</Text>}
                </View>
              ))}
            </View>
          )}
          {product.detail_html && <View className='card'><Text className='ch'>图文详解</Text><RichText nodes={product.detail_html} /></View>}
        </View>
      </ScrollView>
    </View>
  )
}
