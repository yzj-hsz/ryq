import { useMemo, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView, RichText, Button } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchProductDetail, fetchWantQrcode, postAnalyticsEvent, postWantClick } from '@/api/services'
import type { ProductDetail } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './detail.scss'

export default function ProductDetailPage() {
  const router = useRouter()
  const [statusPad, setStatusPad] = useState(20)
  const [showQr, setShowQr] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [product, setProduct] = useState<ProductDetail | null>(null)

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
  })

  const gallery = product?.gallery?.length ? product.gallery : product?.cover_url ? [{ url: product.cover_url, sort_order: 0 }] : []
  const processSteps = useMemo(
    () => (product?.process_text ? product.process_text.split(/\s*->\s*|\s*→\s*/) : []),
    [product?.process_text]
  )

  const onWant = async () => {
    if (!product) return

    try {
      await postWantClick(product.id)
      const result = await fetchWantQrcode(product.id)
      setQrUrl(result.qrcode_url)
      setShowQr(true)
    } catch {
      Taro.showToast({ title: '获取二维码失败', icon: 'none' })
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
        <View className='pad'>
          <Text className='title'>{product.name}</Text>
          <Text className='summary'>{product.summary}</Text>
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
          <View className='spacer' />
        </View>
      </ScrollView>
      <View className='want-bar'>
        <Button type='primary' className='want-btn' onClick={onWant}>我想要</Button>
      </View>
      {showQr && (
        <View className='modal' onClick={() => setShowQr(false)}>
          <View className='modal-inner' onClick={(e) => e.stopPropagation()}>
            <Text className='mt'>扫码了解更多 / 定制咨询</Text>
            {qrUrl && <Image className='qr' src={formatUrl(qrUrl)} mode='aspectFit' showMenuByLongpress />}
            <Button onClick={() => setShowQr(false)}>关闭</Button>
          </View>
        </View>
      )}
    </View>
  )
}
