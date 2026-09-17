import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { fetchProducts, postAnalyticsEvent } from '@/api/services'
import './custom.scss'

type BoxType = 'square' | 'circle'

interface GiftOption {
  id: number
  name: string
  summary: string
  w: number
  h: number
  cells: number
  color: string
}

interface PlacedItem extends GiftOption {
  key: number
  x: number
  y: number
}

const GRID = 3
const CAPACITY = GRID * GRID

const PALETTE = ['#c48044', '#3d6b50', '#c94d4d', '#5b6e8a', '#9a5f2e', '#7a4a6e']
const SIZE_TABLE = [
  { w: 1, h: 1 },
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 1, h: 1 },
]

const FALLBACK_OPTIONS: GiftOption[] = [
  { id: 101, name: 'A·茶染丝巾', summary: '占位 1×1 格', w: 1, h: 1, cells: 1, color: '#c48044' },
  { id: 102, name: 'B·茶染茶席', summary: '占位 2×2 格', w: 2, h: 2, cells: 4, color: '#3d6b50' },
  { id: 103, name: 'C·高山单枞', summary: '占位 1×1 格', w: 1, h: 1, cells: 1, color: '#c94d4d' },
  { id: 104, name: 'D·手作杯垫', summary: '占位 2×1 格', w: 2, h: 1, cells: 2, color: '#5b6e8a' },
  { id: 105, name: 'E·非遗书签', summary: '占位 1×2 格', w: 1, h: 2, cells: 2, color: '#9a5f2e' },
  { id: 106, name: 'F·文创明信片', summary: '占位 1×1 格', w: 1, h: 1, cells: 1, color: '#7a4a6e' },
]

function findSlot(occupancy: boolean[][], w: number, h: number): { x: number; y: number } | null {
  for (let y = 0; y <= GRID - h; y++) {
    for (let x = 0; x <= GRID - w; x++) {
      let free = true
      for (let dy = 0; dy < h && free; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (occupancy[y + dy][x + dx]) {
            free = false
            break
          }
        }
      }
      if (free) return { x, y }
    }
  }
  return null
}

export default function GiftboxCustomPage() {
  const router = useRouter()
  const [boxType, setBoxType] = useState<BoxType>('square')
  const [lidOpen, setLidOpen] = useState(true)
  const [options, setOptions] = useState<GiftOption[]>(FALLBACK_OPTIONS)
  const [placed, setPlaced] = useState<PlacedItem[]>([])
  const [fly, setFly] = useState<{ key: number; color: string; name: string } | null>(null)
  const [justLanded, setJustLanded] = useState<number | null>(null)
  const [pendingKey, setPendingKey] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const keySeq = useRef(1)
  // 请求锁（ref 同步判读，不受渲染闭包过期影响）+ 占位镜像（同步真值）
  const addingRef = useRef(false)
  const placedRef = useRef<PlacedItem[]>([])
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 同步提交占位：ref 与 state 同一 tick 更新，杜绝并发校验看到旧值 */
  const syncPlaced = (next: PlacedItem[]) => {
    placedRef.current = next
    setPlaced(next)
  }

  const buildOccupancy = (list: PlacedItem[]) => {
    const grid: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false))
    list.forEach((p) => {
      for (let dy = 0; dy < p.h; dy++) {
        for (let dx = 0; dx < p.w; dx++) {
          if (p.y + dy < GRID && p.x + dx < GRID) grid[p.y + dy][p.x + dx] = true
        }
      }
    })
    return grid
  }

  const usedOf = (list: PlacedItem[]) => list.reduce((sum, p) => sum + p.cells, 0)

  // 卸载时清理未完成的飞入定时器，防止 setState 泄漏
  useEffect(
    () => () => {
      if (flyTimer.current) clearTimeout(flyTimer.current)
      if (landTimer.current) clearTimeout(landTimer.current)
    },
    []
  )

  useEffect(() => {
    const id = Number(router.params.id)
    void postAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/pages/giftbox/custom',
      target_type: id ? 'product' : undefined,
      target_id: id || undefined,
    }).catch(() => {})
    fetchProducts({})
      .then((res) => {
        const items = res.items || []
        if (!items.length) return
        setOptions(
          items.slice(0, 12).map((item, index) => {
            const size = SIZE_TABLE[index % SIZE_TABLE.length]
            return {
              id: item.id,
              name: item.name,
              summary: item.summary || '文创好物',
              w: size.w,
              h: size.h,
              cells: size.w * size.h,
              color: PALETTE[index % PALETTE.length],
            }
          })
        )
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usedCells = useMemo(() => usedOf(placed), [placed])
  // 进度展示钳制：永远不大于总格数
  const cappedUsed = Math.min(usedCells, CAPACITY)

  const switchBox = (t: BoxType) => {
    if (t === boxType) return
    setBoxType(t)
    // 切换盒型时做一次落位重排：按面积从大到小依次重放，放不下则退回并提示
    const sorted = [...placedRef.current].sort((a, b) => b.cells - a.cells)
    const grid: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false))
    const kept: PlacedItem[] = []
    let dropped = 0
    sorted.forEach((p) => {
      const slot = findSlot(grid, p.w, p.h)
      if (slot) {
        for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) grid[slot.y + dy][slot.x + dx] = true
        kept.push({ ...p, x: slot.x, y: slot.y })
      } else {
        dropped += 1
      }
    })
    syncPlaced(kept)
    if (dropped > 0) {
      Taro.showToast({ title: `新盒型放不下${dropped}件，已退回`, icon: 'none' })
    }
  }

  const handleAdd = (opt: GiftOption) => {
    // 请求锁 + 防抖：本次飞入流程未完成前，禁止再次触发添加
    if (addingRef.current) return
    // 校验1（点击瞬间）：当前已占用 + 待添加 是否超出总容量，超限直接拦截
    if (usedOf(placedRef.current) + opt.cells > CAPACITY) {
      Taro.showToast({ title: '礼盒空间不足，无法继续添加', icon: 'none' })
      return
    }
    const slot = findSlot(buildOccupancy(placedRef.current), opt.w, opt.h)
    if (!slot) {
      Taro.showToast({ title: '礼盒空间不足，无法继续添加', icon: 'none' })
      return
    }
    // 校验2（飞入动画执行前）：同一 tick 内复算一次，防止并发添加突破上限
    if (usedOf(placedRef.current) + opt.cells > CAPACITY) {
      Taro.showToast({ title: '礼盒空间不足，无法继续添加', icon: 'none' })
      return
    }
    // 加锁并同步占位：校验与落子同一 tick 完成，后续点击必然看到最新占位
    addingRef.current = true
    setAdding(true)
    const key = keySeq.current++
    syncPlaced([...placedRef.current, { ...opt, key, x: slot.x, y: slot.y }])
    // 新色块先隐藏，飞入动画播完再落定展示（动画行为与之前一致）
    setPendingKey(key)
    setFly({ key, color: opt.color, name: opt.name })
    setLidOpen(true)
    flyTimer.current = setTimeout(() => {
      setFly(null)
      setPendingKey(null)
      setJustLanded(key)
      // 解锁：本次添加流程完成，恢复添加按钮
      addingRef.current = false
      setAdding(false)
      landTimer.current = setTimeout(() => {
        setJustLanded((cur) => (cur === key ? null : cur))
      }, 650)
    }, 480)
  }

  const handleRemove = (key: number) => {
    syncPlaced(placedRef.current.filter((p) => p.key !== key))
  }

  const handleClear = () => {
    // 清空在途的飞入任务，释放全部占位并解锁添加按钮
    if (flyTimer.current) {
      clearTimeout(flyTimer.current)
      flyTimer.current = null
    }
    if (landTimer.current) {
      clearTimeout(landTimer.current)
      landTimer.current = null
    }
    addingRef.current = false
    setAdding(false)
    setFly(null)
    setPendingKey(null)
    setJustLanded(null)
    if (!placedRef.current.length) return
    syncPlaced([])
    Taro.showToast({ title: '已清空礼盒', icon: 'none' })
  }

  return (
    <View className='gift-page'>
      <View className='gift-topbar'>
        <Text className='back active-scale' onClick={() => Taro.navigateBack()}>返回</Text>
        <Text className='gift-title'>礼盒选配</Text>
        <Text className='gift-cap'>{cappedUsed}/{CAPACITY}格</Text>
      </View>

      {/* 上半区：礼盒可视化预览 */}
      <View className='preview-zone'>
        <View className='seg'>
          <View className={`seg-item ${boxType === 'square' ? 'on' : ''}`} onClick={() => switchBox('square')}>
            <Text>方形礼盒</Text>
          </View>
          <View className={`seg-item ${boxType === 'circle' ? 'on' : ''}`} onClick={() => switchBox('circle')}>
            <Text>圆形礼盒</Text>
          </View>
        </View>

        <View className={`box-stage ${boxType}`} onClick={() => setLidOpen((v) => !v)}>
          <View className={`box-lid ${lidOpen ? 'open' : ''} ${boxType}`}>
            <Text className='lid-text'>饶有趣 · 茶染礼盒</Text>
            <Text className='lid-sub'>{lidOpen ? '已开盖 · 点击合盖' : '已合盖 · 点击开盖'}</Text>
          </View>
          <View className={`box-body ${boxType} ${lidOpen ? 'open' : ''}`}>
            {/* 网格底纹：方形 3×3，圆形同样 3×3 但被圆形边界裁剪 */}
            <View className='grid-bg'>
              {Array.from({ length: CAPACITY }).map((_, i) => (
                <View key={i} className='grid-cell' />
              ))}
            </View>
            {/* 已放商品：位于与网格底纹同 inset 的 placed-layer 内，百分比定位严格不出界 */}
            <View className='placed-layer'>
              {placed.map((p) => (
                <View
                  key={p.key}
                  className={`gift-block${justLanded === p.key ? ' land' : ''}${pendingKey === p.key ? ' entering' : ''}`}
                  style={{
                    left: `${(p.x / GRID) * 100}%`,
                    top: `${(p.y / GRID) * 100}%`,
                    width: `${(p.w / GRID) * 100}%`,
                    height: `${(p.h / GRID) * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(p.key)
                  }}
                >
                  <View
                    className='gift-block-inner'
                    style={{
                      background: p.color,
                      // 圆形礼盒自动适配圆角：正方形格变圆，长条格变胶囊
                      borderRadius: boxType === 'circle' ? (p.w === p.h ? '50%' : '999px') : undefined,
                    }}
                  >
                    <Text className='gb-name'>{p.name}</Text>
                    <Text className='gb-size'>{p.w}×{p.h}</Text>
                  </View>
                </View>
              ))}
            </View>
            {placed.length === 0 && (
              <View className='box-empty'>
                <Text className='box-empty-t'>点击下方商品加入礼盒</Text>
                <Text className='box-empty-s'>点击已放入色块可取出</Text>
              </View>
            )}
          </View>
        </View>

        {/* 容量条 + 操作 */}
        <View className='cap-row'>
          <View className='cap-bar'>
            <View className='cap-fill' style={{ width: `${(cappedUsed / CAPACITY) * 100}%` }} />
          </View>
          <Text className='cap-text'>已用 {cappedUsed}/{CAPACITY} 格</Text>
          <Text className='clear-btn' onClick={handleClear}>清空</Text>
        </View>

        {/* 飞入动画层：从底部向礼盒飞的纯色块 */}
        {fly && (
          <View className='fly-layer'>
            <View className='fly-block' style={{ background: fly.color }}>
              <Text className='fly-name'>{fly.name}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 下半区：商品选择列表 */}
      <ScrollView scrollY className='goods-list'>
        {options.map((opt) => {
          const disabled = usedCells + opt.cells > CAPACITY || adding
          return (
            <View key={opt.id} className='goods-card'>
              <View className='swatch' style={{ background: opt.color }}>
                <Text className='swatch-size'>{opt.w}×{opt.h}</Text>
              </View>
              <View className='goods-info'>
                <Text className='goods-name'>{opt.name}</Text>
                <Text className='goods-desc'>{opt.summary}</Text>
                <Text className='goods-slot'>占位 {opt.w}×{opt.h}（共{opt.cells}格）</Text>
              </View>
              <Button
                className={`add-btn ${disabled ? 'disabled' : ''}`}
                disabled={disabled}
                loading={adding}
                onClick={() => handleAdd(opt)}
              >
                {adding ? '加入中' : '添加'}
              </Button>
            </View>
          )
        })}
        <View className='list-pad' />
      </ScrollView>
    </View>
  )
}
