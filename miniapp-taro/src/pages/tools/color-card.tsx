import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  fetchColorCardOptions,
  fetchColorPreset,
  postAnalyticsEvent,
  postSaveDiyRecord,
  uploadFile,
} from '@/api/services'
import { fetchMe } from '@/api/auth'
import type { ColorOption } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './color-card.scss'

type Dim = { code: string; name: string; options: ColorOption[] }

export default function ColorCardPage() {
  const [dims, setDims] = useState<Dim[]>([])
  const [sel, setSel] = useState<Record<string, number>>({})
  const [preview, setPreview] = useState<string | null>(null)
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

    fetchColorCardOptions()
      .then((result) => setDims(result.dimensions))
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
  }, [])

  useEffect(() => {
    const codes = dims.map((dim) => dim.code)
    if (codes.length === 0) return

    const ids = codes.map((code) => sel[code]).filter((value) => value !== undefined && value !== null)
    if (ids.length < dims.length) {
      setPreview(null)
      return
    }

    const fabricId = sel.fabric
    const patternId = sel.pattern
    const mordantId = sel.mordant
    const timeId = sel.dye_time

    if (fabricId && patternId && mordantId && timeId) {
      const selectionKey = [fabricId, patternId, mordantId, timeId].join('-')
      fetchColorPreset(fabricId, patternId, mordantId, timeId)
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
    }
  }, [sel, dims, lastTrackedSelection])

  const pick = (code: string, id: number) => setSel((current) => ({ ...current, [code]: id }))

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

  const onUploadDiy = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1 })
      Taro.showLoading({ title: '上传中...' })
      const uploadRes = await uploadFile(res.tempFilePaths[0])
      Taro.hideLoading()
      void saveRecord(uploadRes.url, true)
    } catch (err: any) {
      Taro.hideLoading()
      if (err.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '上传失败', icon: 'none' })
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
            {preview ? (
              <Image className='preview-img' src={preview} mode='aspectFit' />
            ) : (
              <View className='empty-preview'>
                <Text className='hint'>请选择四个维度查看预览图</Text>
              </View>
            )}
            <View className='btn-group'>
              <Button className={`save-btn ${!preview ? 'disabled' : 'secondary'}`} onClick={onSavePreset} disabled={!preview}>
                保存此预览方案
              </Button>
              <Button className='save-btn' onClick={onUploadDiy}>上传我的真实作品</Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
