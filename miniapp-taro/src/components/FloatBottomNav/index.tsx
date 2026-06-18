import { View, Text } from '@tarojs/components'
import './index.scss'

const ITEMS = [
  { label: '首页', icon: '🏠' },
  { label: '饶平文创', icon: '🎯' },
  { label: '玩转饶平', icon: '⭐' },
  { label: '认识饶平', icon: '▦' },
  { label: '我的', icon: '👤' },
]

interface Props {
  current: number
  onChange: (index: number) => void
}

export default function FloatBottomNav({ current, onChange }: Props) {
  return (
    <View className='bottom-nav-float'>
      {ITEMS.map((item, idx) => (
        <View
          key={item.label}
          className={`nav-item ${current === idx ? 'active' : ''}`}
          onClick={() => onChange(idx)}
        >
          <Text className='nav-icon'>{item.icon}</Text>
          <Text className='nav-label'>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
