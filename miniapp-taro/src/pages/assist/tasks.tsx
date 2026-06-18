import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchTaskShowcases } from '@/api/services'
import type { TaskBrief } from '@/api/types'
import { formatUrl } from '@/utils/url'
import './tasks.scss'

const STATUS: Record<string, string> = {
  available: '可接取',
  ongoing: '进行中',
  completed: '已完成',
}

const STATUS_DESC: Record<string, string> = {
  available: '适合立即参与，按流程完成后提交验收',
  ongoing: '当前为示例进行状态，可查看参考流程',
  completed: '任务已归档，可参考成品与执行方式',
}

const DIFFICULTY_CLASS: Record<string, string> = {
  低: 'easy',
  中: 'medium',
  高: 'hard',
}

export default function TasksPage() {
  const [items, setItems] = useState<TaskBrief[]>([])

  useEffect(() => {
    fetchTaskShowcases()
      .then((result) => setItems(result.items))
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
  }, [])

  return (
    <View className='tasks-page'>
      <View className='hero'>
        <View className='bar'>
          <Text className='back ghost' onClick={() => Taro.navigateBack()}>返回</Text>
          <Text className='t'>任务展示</Text>
        </View>
        <View className='hero-card'>
          <Text className='hero-kicker'>Tea Dye Studio</Text>
          <Text className='hero-title'>茶染公益任务计划</Text>
          <Text className='hero-desc'>以真实派单流程为蓝本，展示从领料、制作到拍照提交的完整协作体验。</Text>
          <View className='hero-meta'>
            <Text className='hero-chip'>居家手作</Text>
            <Text className='hero-chip'>公益演示</Text>
            <Text className='hero-chip'>{items.length} 个任务</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY className='scroll'>
        <View className='tip'>
          <Text className='tip-label'>演示流程</Text>
          <Text className='tip-t'>公益派单流程</Text>
          <Text className='tip-p'>平台派单 · 居家制作 · 拍照上传 · 回收验收</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} className='task' onClick={() => Taro.navigateTo({ url: `/pages/assist/task-detail?id=${item.id}` })}>
            <View className='task-media-wrap'>
              <Image className='ti' src={formatUrl(item.cover_url)} mode='aspectFill' />
              <View className='task-overlay'>
                <Text className={`status-pill ${item.status_label}`}>{STATUS[item.status_label] || item.status_label}</Text>
                <Text className={`difficulty-pill ${DIFFICULTY_CLASS[item.difficulty] || 'easy'}`}>难度 {item.difficulty}</Text>
              </View>
            </View>
            <View className='tb'>
              <Text className='tn'>{item.name}</Text>
              <Text className='task-summary'>{item.summary || STATUS_DESC[item.status_label] || '查看任务详情与操作说明'}</Text>
              <View className='task-meta'>
                <Text className='meta-chip'>截止 {item.deadline_note}</Text>
                <Text className='meta-chip'>{STATUS_DESC[item.status_label] || '查看详情'}</Text>
              </View>
              <View className='task-footer'>
                <Text className='task-link'>查看任务详情</Text>
                <Text className='task-arrow'>{'>'}</Text>
              </View>
            </View>
          </View>
        ))}

        <View className='bottom-pad' />
      </ScrollView>
    </View>
  )
}
