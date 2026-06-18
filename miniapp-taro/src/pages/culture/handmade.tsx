import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchProducts } from '@/api/services'
import type { ProductListItem } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './handmade.scss'

function tagClass(tag: string) {
  if (tag === '非遗') return 'tag-heritage'
  if (tag === '手作') return 'tag-handmade'
  if (tag === '原生色') return 'tag-original'
  if (tag === '助农') return 'tag-farmer'
  return 'tag-disability'
}

export default function HandmadePage() {
  const [items, setItems] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts({ list_category: 'handmade' })
      .then((res) => setItems(res.items))
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <View className='handmade-page'>
      <View className='bar'>
        <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='t'>匠心手作</Text>
      </View>

      <ScrollView scrollY className='scroll'>
        <View className='hero'>
          <Text className='hero-title'>匠心手作商品</Text>
          <Text className='hero-desc'>集中展示扶残助残项目中的手工作品，如手工编织凉席等匠心商品。</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} className='card' onClick={() => Taro.navigateTo({ url: `/pages/product/detail?id=${item.id}` })}>
            <Image className='cover' src={formatUrl(item.cover_url)} mode='aspectFill' />
            <View className='info'>
              <Text className='name'>{item.name}</Text>
              <Text className='desc'>{item.summary}</Text>
              <View className='tags'>
                {item.tags.map((tag) => (
                  <Text key={tag} className={`tag ${tagClass(tag)}`}>{tag}</Text>
                ))}
              </View>
            </View>
          </View>
        ))}

        {!loading && items.length === 0 && (
          <View className='empty'>
            <Text>暂无匠心手作商品</Text>
          </View>
        )}

        <View className='bottom-pad' />
      </ScrollView>
    </View>
  )
}
