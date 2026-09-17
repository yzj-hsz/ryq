import { View, Text } from '@tarojs/components'

interface EmptyStateProps {
  title?: string
  description: string
}

export default function EmptyState({ title = '暂无内容', description }: EmptyStateProps) {
  return (
    <View className='ui-empty'>
      <View className='ui-empty-graphic'>
        <View className='ui-empty-dot dot-main' />
        <View className='ui-empty-dot dot-side' />
        <View className='ui-empty-line line-top' />
        <View className='ui-empty-line line-bottom' />
      </View>
      <Text className='ui-empty-title'>{title}</Text>
      <Text className='ui-empty-desc'>{description}</Text>
    </View>
  )
}
