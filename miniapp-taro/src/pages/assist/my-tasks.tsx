import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchMyTasks, postSubmitTask, uploadFile } from '@/api/services'
import { formatUrl } from '@/utils/url'
import './my-tasks.scss'

const STATUS_LABEL: Record<string, string> = {
  accepted: '已接取',
  submitted: '已提交',
  completed: '已完成',
}

const STATUS_CLASS: Record<string, string> = {
  accepted: 'ongoing',
  submitted: 'ongoing',
  completed: 'completed',
}

export default function MyTasksPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchMyTasks()
      .then((result) => setItems(result.items))
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (id: number) => {
    try {
      const picked = await Taro.chooseImage({ count: 1 })
      if (!picked.tempFilePaths?.[0]) return

      Taro.showLoading({ title: '上传中...' })
      const uploaded = await uploadFile(picked.tempFilePaths[0])
      Taro.hideLoading()

      const modal: any = await Taro.showModal({
        title: '提交作品',
        content: '',
        editable: true,
        placeholderText: '请输入作品说明（可选）',
      } as any)
      if (!modal.confirm) return

      await postSubmitTask(id, uploaded.url, modal.content || '用户提交作品')
      Taro.showToast({ title: '提交成功', icon: 'success' })
      load()
    } catch (err: any) {
      Taro.hideLoading()
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
    }
  }

  return (
    <View className='tasks-page'>
      <View className='hero'>
        <View className='bar'>
          <Text className='back ghost' onClick={() => Taro.navigateBack()}>返回</Text>
          <Text className='t'>我的任务</Text>
        </View>
        <View className='hero-card'>
          <Text className='hero-kicker'>My Tasks</Text>
          <Text className='hero-title'>任务进度与提交</Text>
          <Text className='hero-desc'>查看你接取的任务状态，并在需要时上传作品图片和提交说明。</Text>
          <View className='hero-meta'>
            <Text className='hero-chip'>{loading ? '加载中' : `${items.length} 个任务`}</Text>
            <Text className='hero-chip'>图片提交</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY className='scroll'>
        {items.length === 0 && !loading && (
          <View className='empty-tip'>
            <Text>暂无接取的任务</Text>
          </View>
        )}

        {items.map((item) => (
          <View key={item.id} className='task'>
            <View className='task-media-wrap'>
              <Image className='ti' src={formatUrl(item.task_cover)} mode='aspectFill' />
              <View className='task-overlay'>
                <Text className={`status-pill ${STATUS_CLASS[item.status] || 'ongoing'}`}>{STATUS_LABEL[item.status] || item.status}</Text>
                <Text className='difficulty-pill medium'>我的任务</Text>
              </View>
            </View>
            <View className='tb'>
              <Text className='tn'>{item.task_name}</Text>
              <Text className='task-summary'>状态：{STATUS_LABEL[item.status] || item.status}</Text>
              {item.status === 'accepted' && (
                <Button className='mini-btn' onClick={() => handleSubmit(item.task_id)}>
                  提交作品
                </Button>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
