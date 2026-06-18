import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchProducts } from '@/api/services'
import { fetchMe } from '@/api/auth'
import type { ProductListItem } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './CultureTab.scss'

const CATEGORIES = [
  { key: 'all', label: '全部', icon: '全' },
  { key: 'brand', label: '礼盒定制', icon: '礼' },
  { key: 'farm', label: '联农助农', icon: '农' },
  { key: 'assist', label: '扶残助残', icon: '助' },
]

function tagClass(tag: string) {
  if (tag === '非遗') return 'tag-heritage'
  if (tag === '手作') return 'tag-handmade'
  if (tag === '原生色') return 'tag-original'
  if (tag === '助农') return 'tag-farmer'
  return 'tag-disability'
}

interface Props {
  active: boolean
  initialCategory?: string
}

export default function CultureTab({ active, initialCategory }: Props) {
  const [currentCat, setCurrentCat] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (initialCategory) {
      setCurrentCat(initialCategory)
    }
  }, [initialCategory])

  const load = async (force = false) => {
    if (loading || (loaded && !force)) return

    setLoading(true)
    try {
      const res = await fetchProducts({})
      setProducts(res.items)
      setLoaded(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '网络错误'
      Taro.showToast({ title: `商品加载失败: ${msg}`, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) {
      void load()
    }
  }, [active])

  const filtered = useMemo(() => {
    let list = products
    if (currentCat !== 'all') {
      list = list.filter((item) => item.list_category === currentCat)
    }

    const lowerKeyword = keyword.trim().toLowerCase()
    if (!lowerKeyword) return list

    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerKeyword) ||
        item.summary.toLowerCase().includes(lowerKeyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    )
  }, [products, currentCat, keyword])

  const handleEntry = async (url: string, restrict = false) => {
    if (restrict) {
      try {
        const user = await fetchMe()
        if (url.includes('color-card') && user.role === 'tourist' && user.username?.startsWith('访客')) {
          await Taro.showModal({
            title: '访客受限',
            content: '访客身份无法使用色卡 DIY 功能，请使用微信号或邮箱登录。',
            showCancel: false,
            confirmText: '我知道了',
          })
          return
        }

        if (url.includes('tasks') && user.role === 'tourist') {
          await Taro.showModal({
            title: '权限受限',
            content: '任务功能仅限“工作者”或“管理员”使用，请联系管理员修改权限。',
            showCancel: false,
            confirmText: '我知道了',
          })
          return
        }
      } catch {
        Taro.navigateTo({ url: '/pages/login/login' })
        return
      }
    }

    Taro.navigateTo({ url })
  }

  return (
    <View className='wc-root'>
      <View className='wc-head'>
        <Text className='wc-title'>饶平文创</Text>
        <Text className='wc-sub'>非遗茶染 · 手作文创 · 助农助残</Text>
      </View>
      <View className='wc-search' hidden={currentCat === 'assist'}>
        <Text className='search-icon'>搜</Text>
        <Input className='search-input' value={keyword} placeholder='搜索礼盒、助农、文创商品' onInput={(e) => setKeyword(e.detail.value)} />
      </View>
      <View className='wc-body'>
        <ScrollView scrollY className='wc-cats' showScrollbar={false}>
          {CATEGORIES.map((category) => (
            <View
              key={category.key}
              className={`wc-cat-item ${currentCat === category.key ? 'active' : ''}`}
              onClick={() => {
                setCurrentCat(category.key)
                setKeyword('')
              }}
            >
              <Text className='cat-emoji'>{category.icon}</Text>
              <Text className='cat-label'>{category.label}</Text>
            </View>
          ))}
        </ScrollView>
        <ScrollView scrollY className='wc-main' showScrollbar={false}>
          {currentCat === 'assist' ? (
            <View className='assist-panel'>
              <View className='assist-hero'>
                <Text className='assist-h3'>扶残助残专区</Text>
                <Text className='assist-p'>整合茶染任务、匠心手作与色卡工具，集中展示残障伙伴参与的非遗实践与助残成果。</Text>
              </View>

              <View className='assist-entry' onClick={() => handleEntry('/pages/assist/tasks', true)}>
                <View className='ae-copy'>
                  <Text className='ae-h4'>茶染任务</Text>
                  <Text className='ae-p'>查看公益派单流程、任务状态与作品展示，直观了解扶残助残项目如何运转。</Text>
                  <Text className='ae-pill'>查看任务</Text>
                </View>
              </View>

              <View className='assist-entry' onClick={() => handleEntry('/pages/culture/handmade')}>
                <View className='ae-copy'>
                  <Text className='ae-h4'>匠心手作</Text>
                  <Text className='ae-p'>进入匠心手作页面，查看手工编织凉席等残障伙伴参与制作的手作文创商品。</Text>
                  <Text className='ae-pill'>进入页面</Text>
                </View>
              </View>

              <View className='assist-entry' onClick={() => handleEntry('/pages/tools/color-card', true)}>
                <View className='ae-copy'>
                  <Text className='ae-h4'>色卡工具</Text>
                  <Text className='ae-p'>组合布料、媒染剂与染制时长，快速预览茶染效果，辅助手作与教学展示。</Text>
                  <Text className='ae-pill'>打开工具</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='wc-products'>
              {filtered.map((item) => (
                <View key={item.id} className='wc-product' onClick={() => Taro.navigateTo({ url: `/pages/product/detail?id=${item.id}` })}>
                  <Image className='p-img' src={formatUrl(item.cover_url)} mode='aspectFill' />
                  <View className='p-info'>
                    <Text className='p-name'>{item.name}</Text>
                    <Text className='p-desc'>{item.summary}</Text>
                    <View className='tags'>
                      {item.tags.map((tag) => (
                        <Text key={tag} className={`tag ${tagClass(tag)}`}>{tag}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {currentCat !== 'assist' && filtered.length === 0 && <View className='empty-state'><Text>暂无相关商品</Text></View>}
          <View className='bottom-pad' />
        </ScrollView>
      </View>
    </View>
  )
}
