import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  fetchPublicColorCardOptions,
  fetchPublicColorPreset,
  postAnalyticsEvent,
  postSaveDiyRecord,
} from '@/api/services'
import { fetchMe } from '@/api/auth'
import type { ColorOption } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './color-card.scss'

type Dim = { code: string; name: string; options: ColorOption[] }

const DEFAULT_DIMS: Dim[] = [
  {
    code: 'fabric',
    name: '布料',
    options: [
      { id: 1, name: '棉布', sort_order: 1 },
      { id: 2, name: '丝绸', sort_order: 2 },
      { id: 3, name: '麻布', sort_order: 3 },
    ],
  },
  {
    code: 'pattern',
    name: '花纹',
    options: [
      { id: 4, name: '纯色', sort_order: 1 },
      { id: 5, name: '扎染纹', sort_order: 2 },
      { id: 6, name: '蜡染纹', sort_order: 3 },
    ],
  },
  {
    code: 'mordant',
    name: '媒染剂',
    options: [
      { id: 7, name: '明矾', sort_order: 1 },
      { id: 8, name: '铁媒染', sort_order: 2 },
      { id: 9, name: '无媒染', sort_order: 3 },
    ],
  },
  {
    code: 'dye_time',
    name: '浸染时间',
    options: [
      { id: 10, name: '10分钟', sort_order: 1 },
      { id: 11, name: '30分钟', sort_order: 2 },
      { id: 12, name: '60分钟', sort_order: 3 },
    ],
  },
]

export default function ColorCardPage() {
  const [dims, setDims] = useState<Dim[]>([])
  const [sel, setSel] = useState<Record<string, number>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [statusPad, setStatusPad] = useState(20)
  const [lastTrackedSelection, setLastTrackedSelection] = useState('')

  useEffect(() => {
    void postAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/pages/tools/color-card',
    }).catch(() => {})
    try {
      const sys = Taro.getSystemInfoSync()
      setStatusPad(sys.statusBarHeight || 20)
    } catch {
      setStatusPad(24)
    }

    fetchPublicColorCardOptions()
      .then((result) => setDims(result.dimensions))
      .catch(() => {
        setDims(DEFAULT_DIMS)
        Taro.showToast({ title: '已使用默认选项', icon: 'none' })
      })
  }, [])

  useEffect(() => {
    const codes = dims.map((dim) => dim.code)
    if (codes.length === 0) return

    const ids = codes.map((code) => sel[code]).filter((value) => value !== undefined && value !== null)
    if (ids.length < dims.length) {
      setPreview(null)
      setPreviewLoading(false)
      return
    }

    const fabricId = sel.fabric
    const patternId = sel.pattern
    const mordantId = sel.mordant
    const timeId = sel.dye_time

    if (fabricId && patternId && mordantId && timeId) {
      const selectionKey = [fabricId, patternId, mordantId, timeId].join('-')
      setPreviewLoading(true)
      fetchPublicColorPreset(fabricId, patternId, mordantId, timeId)
        .then((result) => {
          const imageUrl = result.image_url ? formatUrl(result.image_url) : null
          setPreview(imageUrl)
          if (imageUrl && selectionKey !== lastTrackedSelection) {
            setLastTrackedSelection(selectionKey)
            void postAnalyticsEvent({
              event_type: 'color_card_use',
              page_path: '/pages/tools/color-card',
              meta: {
                fabric_id: fabricId,
                pattern_id: patternId,
                mordant_id: mordantId,
                time_id: timeId,
              },
            }).catch(() => {})
          }
        })
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false))
    }
  }, [sel, dims, lastTrackedSelection])

  const pick = (code: string, id: number) => setSel((current) => ({ ...current, [code]: id }))

  const selectedOptions = useMemo(() => {
    const findOption = (code: string) => dims.find((dim) => dim.code === code)?.options.find((option) => option.id === sel[code]) || null
    return {
      fabric: findOption('fabric'),
      pattern: findOption('pattern'),
      mordant: findOption('mordant'),
      dyeTime: findOption('dye_time'),
    }
  }, [dims, sel])

  const fallbackReady = Boolean(
    selectedOptions.fabric && selectedOptions.pattern && selectedOptions.mordant && selectedOptions.dyeTime
  )

  const fabricClass = useMemo(() => {
    const name = selectedOptions.fabric?.name || ''
    if (name.includes('棉')) return 'fabric-cotton'
    if (name.includes('丝')) return 'fabric-silk'
    if (name.includes('麻')) return 'fabric-linen'
    return 'fabric-default'
  }, [selectedOptions.fabric])

  const patternClass = useMemo(() => {
    const name = selectedOptions.pattern?.name || ''
    if (name.includes('扎')) return 'pattern-tie'
    if (name.includes('蜡')) return 'pattern-batik'
    return 'pattern-solid'
  }, [selectedOptions.pattern])

  const checkGuest = async () => {
    try {
      const user = await fetchMe()
      if (user.role === 'tourist' && user.username?.startsWith('访客')) {
        await Taro.showModal({
          title: '访客受限',
          content: '访客身份无法使用色卡保存与作品上传功能，请使用微信号或邮箱登录。',
          showCancel: false,
          confirmText: '我知道了',
        })
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const saveRecord = async (imageUrl: string, isUploaded: boolean) => {
    if (await checkGuest()) return

    const res: any = await Taro.showModal({
      title: isUploaded ? '保存作品' : '保存方案',
      content: '',
      editable: true,
      placeholderText: '请输入名称（可选）',
    } as any)

    if (!res.confirm) return

    try {
      const selectionSnapshot = dims.map((dim) => {
        const option = dim.options.find((item) => item.id === sel[dim.code])
        return {
          code: dim.code,
          name: dim.name,
          option_id: option?.id || null,
          option_name: option?.name || '未选择',
        }
      })
      const selectedNames = selectionSnapshot.map((item) => `${item.name}: ${item.option_name}`).join(', ')

      await postSaveDiyRecord({
        source_type: 'color_card',
        payload: {
          selection: sel,
          selection_snapshot: selectionSnapshot,
          summary: selectedNames,
          type: isUploaded ? 'upload' : 'preset',
        },
        preview_image_url: imageUrl,
        title: res.content || (isUploaded ? `我的作品 ${new Date().toLocaleDateString()}` : `色卡方案 ${new Date().toLocaleDateString()}`),
      })
      Taro.showToast({ title: '已保存至个人中心', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  const onSavePreset = () => {
    if (preview) {
      void saveRecord(preview, false)
    }
  }

  return (
    <View className='color-page' style={{ paddingTop: `${statusPad}px` }}>
      <View className='bar'>
        <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='t'>色卡预览</Text>
      </View>
      <ScrollView scrollY className='scroll'>
        {dims.map((dim) => (
          <View key={dim.code} className='dim'>
            <Text className='dim-name'>{dim.name}</Text>
            <View className='opts'>
              {dim.options.map((option) => (
                <View key={option.id} className={`opt ${sel[dim.code] === option.id ? 'on' : ''}`} onClick={() => pick(dim.code, option.id)}>
                  {option.name}
                </View>
              ))}
            </View>
          </View>
        ))}
        <View className='preview-box'>
          <View className='preview-container'>
            {previewLoading ? (
              <View className='empty-preview preview-stage'>
                <Text className='hint'>预览图加载中...</Text>
              </View>
            ) : preview ? (
              <View className='preview-stage has-preview'>
                <View className={`preview-fallback preview-fallback-bg ${fabricClass} ${patternClass}`}>
                  <View className='preview-fallback-top'>
                    <Text className='preview-fallback-badge'>茶染预览</Text>
                    <Text className='preview-fallback-title'>{selectedOptions.pattern?.name || '预览方案'}</Text>
                  </View>
                  <View className='preview-fallback-cloth' />
                  <View className='preview-fallback-meta'>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.fabric?.name || '布料'}</Text>
                    </View>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.mordant?.name || '媒染剂'}</Text>
                    </View>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.dyeTime?.name || '浸染时间'}</Text>
                    </View>
                  </View>
                </View>
                <View className='preview-image-shell'>
                  <Image
                    className='preview-img'
                    src={preview}
                    mode='aspectFit'
                    onError={() => {
                      setPreview(null)
                      Taro.showToast({ title: '预览图加载失败', icon: 'none' })
                    }}
                  />
                </View>
              </View>
            ) : fallbackReady ? (
              <View className='preview-stage'>
                <View className={`preview-fallback ${fabricClass} ${patternClass}`}>
                  <View className='preview-fallback-top'>
                    <Text className='preview-fallback-badge'>茶染预览</Text>
                    <Text className='preview-fallback-title'>{selectedOptions.pattern?.name || '预览方案'}</Text>
                  </View>
                  <View className='preview-fallback-cloth' />
                  <View className='preview-fallback-meta'>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.fabric?.name}</Text>
                    </View>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.mordant?.name}</Text>
                    </View>
                    <View className='preview-fallback-chip'>
                      <Text>{selectedOptions.dyeTime?.name}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View className='empty-preview preview-stage'>
                <Text className='hint'>请选择四个维度查看预览图</Text>
              </View>
            )}
            <View className='btn-group'>
              <Button className={`save-btn ${!preview ? 'disabled' : 'secondary'}`} onClick={onSavePreset} disabled={!preview}>
                保存此预览方案
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
