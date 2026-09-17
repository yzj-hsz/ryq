import type { ReactNode } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'

interface AdminModalProps {
  visible: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * 管理端统一悬浮弹窗：居中展示，表单在弹窗内滚动，支持关闭 / 取消 / 保存。
 * 仅承载交互，不涉及任何数据接口或字段。
 */
export default function AdminModal({ visible, title, onClose, footer, children }: AdminModalProps) {
  if (!visible) return null

  return (
    <View className='admin-modal-mask' catchMove onClick={onClose}>
      <View className='admin-modal' onClick={(event) => event.stopPropagation()}>
        <View className='admin-modal-header'>
          <Text className='admin-modal-title'>{title}</Text>
          <View className='admin-modal-close' onClick={onClose}>
            <Text className='admin-modal-close-text'>×</Text>
          </View>
        </View>
        <ScrollView scrollY className='admin-modal-body'>
          <View className='admin-modal-content'>{children}</View>
        </ScrollView>
        {footer ? <View className='admin-modal-footer'>{footer}</View> : null}
      </View>
    </View>
  )
}
