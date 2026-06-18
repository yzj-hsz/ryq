import { useState } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { fetchTaskDetail, postAcceptTask } from '@/api/services'
import { fetchMe, type AuthUser } from '@/api/auth'
import { formatUrl } from '@/utils/url'
import './task-detail.scss'

const STATUS: Record<string, string> = {
  available: '可接取',
  ongoing: '进行中',
  completed: '已完成',
}

export default function TaskDetailPage() {
  const router = useRouter()
  const [task, setTask] = useState<Record<string, any> | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    const id = Number(router.params.id)
    if (!id) return

    fetchTaskDetail(id)
      .then(setTask)
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))

    fetchMe().then(setUser).catch(() => {})
  })

  const handleAccept = async () => {
    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (user.role !== 'worker' && user.role !== 'admin') {
      Taro.showModal({
        title: '权限不足',
        content: '该任务仅限“工作者”或“管理员”接取，请联系管理员修改权限。',
        showCancel: false,
      })
      return
    }

    if (!task?.id) return

    setLoading(true)
    try {
      await postAcceptTask(Number(task.id))
      Taro.showToast({ title: '接取成功', icon: 'success' })
    } catch (err: any) {
      Taro.showToast({ title: err.data?.message || '接取失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (!task) {
    return (
      <View className='sub-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  const processText = String(task.process_text || '')
  const processSteps = processText
    .split(/\s*(?:->|→|➡|＞|>)\s*/g)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <View className='sub-page'>
      <Text className='back' onClick={() => Taro.navigateBack()}>返回</Text>
      <ScrollView scrollY className='detail-scroll'>
        <View className='detail-hero'>
          <Image className='cover' src={formatUrl(String(task.cover_url || ''))} mode='aspectFill' />
          <View className='hero-fade' />
          <View className='hero-content'>
            <View className='detail-badges'>
              <Text className={`detail-badge status ${String(task.status_label || '')}`}>{STATUS[String(task.status_label || '')] || String(task.status_label || '任务')}</Text>
              <Text className='detail-badge soft'>难度 {String(task.difficulty || '-')}</Text>
            </View>
            <Text className='title'>{String(task.name || '')}</Text>
            <View className='detail-meta'>
              <Text className='meta-chip'>分类 {String(task.category || '-')}</Text>
              <Text className='meta-chip'>截止 {String(task.deadline_note || '-')}</Text>
            </View>
          </View>
        </View>
        <View className='body'>
          <Text className='summary'>{String(task.description || '')}</Text>
          {Boolean(task.reference_image_url) && (
            <View className='preview-card'>
              <View className='preview-head'>
                <Text className='ch'>参考素材</Text>
                <Text className='preview-note'>用于理解成品风格与执行方向</Text>
              </View>
              <Image className='preview-image' src={formatUrl(String(task.reference_image_url || ''))} mode='aspectFill' />
            </View>
          )}
          {Boolean(task.requirement) && <View className='card'><Text className='ch'>任务要求</Text><Text className='card-text'>{String(task.requirement)}</Text></View>}
          {processSteps.length > 1 ? (
            <View className='card timeline'>
              <Text className='ch'>执行流程</Text>
              <View className='timeline-list'>
                {processSteps.map((step, index) => (
                  <View className='timeline-item' key={`${index}-${step}`}>
                    <View className='timeline-marker'>
                      <View className='timeline-dot' />
                      {index < processSteps.length - 1 ? <View className='timeline-line' /> : null}
                    </View>
                    <View className='timeline-body'>
                      <Text className='timeline-title'>{step}</Text>
                      <Text className='timeline-sub'>第 {index + 1} 步</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : Boolean(task.process_text) ? (
            <View className='card'><Text className='ch'>执行流程</Text><Text className='card-text'>{String(task.process_text)}</Text></View>
          ) : null}
          {Boolean(task.materials) && <View className='card'><Text className='ch'>材料准备</Text><Text className='card-text'>{String(task.materials)}</Text></View>}
        </View>
        <View className='bottom-bar'>
          <Button className='accept-btn' onClick={handleAccept} loading={loading} disabled={loading}>
            立即接取任务
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
