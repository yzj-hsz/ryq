import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Button, Switch } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import {
  fetchGiftBoxGoods,
  fetchGiftBoxes,
  postAnalyticsEvent,
  saveMyGiftBox,
} from '@/api/services'
import { fetchMe } from '@/api/auth'
import { goLoginPage, isGuestUser, isLoggedIn } from '@/utils/auth'
import { navigateBackOrRelaunch } from '@/utils/navigation'
import type { GiftBoxBrief } from '@/api/services'
import './custom.scss'

type BoxType = 'square' | 'circle'

interface GiftOption {
  goodsId: number
  id: number
  name: string
  summary: string
  spec: string
  material: string
  w: number
  h: number
  cells: number
  price: number
  color: string
  productId: number | null
  productSummary: string
  productName: string
  productCover: string
}

interface PlacedItem extends GiftOption {
  key: number
  x: number
  y: number
}

const GRID = 3
const CAPACITY = GRID * GRID

const PALETTE = ['#c48044', '#3d6b50', '#c94d4d', '#5b6e8a', '#9a5f2e', '#7a4a6e']

const FALLBACK_BOXES: GiftBoxBrief[] = [
  { id: 0, name: '方形礼盒', box_type: 'square', packing_fee: 0, min_price: 0, sort_order: 0 },
]

const FALLBACK_OPTIONS: GiftOption[] = [
  { goodsId: 101, id: 101, name: 'A·茶染丝巾', summary: '植物染桑蚕丝巾，茶汤固色，温润亲肤。', spec: '68×68cm', material: '桑蚕丝·植物染', w: 1, h: 1, cells: 1, price: 0, color: '#c48044', productId: null, productSummary: '', productName: '', productCover: '' },
  { goodsId: 102, id: 102, name: 'B·茶染茶席', summary: '手工茶染棉麻茶席，吸水耐泡。', spec: '40×60cm', material: '棉麻·茶染', w: 2, h: 2, cells: 4, price: 0, color: '#3d6b50', productId: null, productSummary: '', productName: '', productCover: '' },
  { goodsId: 103, id: 103, name: 'C·高山单枞', summary: '饶平高山单枞，蜜兰香型。', spec: '8g×6小泡', material: '饶平高山乌龙茶', w: 1, h: 1, cells: 1, price: 0, color: '#c94d4d', productId: null, productSummary: '', productName: '', productCover: '' },
  { goodsId: 104, id: 104, name: 'D·手作杯垫', summary: '茶染布艺杯垫，隔热防滑。', spec: '直径11cm×2枚', material: '茶染棉布·隔热垫片', w: 2, h: 1, cells: 2, price: 0, color: '#5b6e8a', productId: null, productSummary: '', productName: '', productCover: '' },
  { goodsId: 105, id: 105, name: 'E·非遗书签', summary: '布马舞纹样书签，硬挺覆膜。', spec: '5×15cm', material: '特种纸·覆膜', w: 1, h: 2, cells: 2, price: 0, color: '#9a5f2e', productId: null, productSummary: '', productName: '', productCover: '' },
  { goodsId: 106, id: 106, name: 'F·文创明信片', summary: '饶平风物插画明信片，可手写祝福。', spec: '10×15cm', material: '300g铜版纸', w: 1, h: 1, cells: 1, price: 0, color: '#7a4a6e', productId: null, productSummary: '', productName: '', productCover: '' },
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
  const [lidOpen, setLidOpen] = useState(true)
  const [boxes, setBoxes] = useState<GiftBoxBrief[]>(FALLBACK_BOXES)
  // 固定方形礼盒：不再从选盒页带 id，后端只启用一个，前端直接取方形启用的那款
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null)
  const [options, setOptions] = useState<GiftOption[]>(FALLBACK_OPTIONS)
  const [saving, setSaving] = useState(false)
  const [placed, setPlaced] = useState<PlacedItem[]>([])
  const [justLanded, setJustLanded] = useState<number | null>(null)
  // 自动整理开关：开 → 加不进时自动重排腾位；关 → 只按当前布局找空位
  const [autoArrange, setAutoArrange] = useState(true)
  // 拖拽换位：长按盒内色块后拖到目标格，松手落位
  const [dragKey, setDragKey] = useState<number | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [dragValid, setDragValid] = useState(true)
  // 登录态预检：none=无 token，guest=访客登录，real=正式用户
  const [authState, setAuthState] = useState<'unknown' | 'none' | 'guest' | 'real'>('unknown')
  const keySeq = useRef(1)
  // 占位镜像：与 state 同一 tick 更新，校验永远基于最新占位，杜绝连点超限
  const placedRef = useRef<PlacedItem[]>([])
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 拖拽过程引用：盒内层矩形、长按计时、是否发生过移动、是否吞掉随后 click
  const boxRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressXY = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)

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

  // 卸载时清理落定定时器，防止 setState 泄漏
  useEffect(
    () => () => {
      if (landTimer.current) clearTimeout(landTimer.current)
      if (pressTimer.current) clearTimeout(pressTimer.current)
    },
    []
  )

  /** 登录态预检：无 token 直接标记 none；有 token 则用 /me 区分访客与正式用户 */
  const refreshAuthState = async () => {
    if (!isLoggedIn()) {
      setAuthState('none')
      return
    }
    try {
      const me = await fetchMe()
      setAuthState(isGuestUser(me) ? 'guest' : 'real')
    } catch {
      setAuthState('none')
    }
  }

  // 每次回到页面都刷新一次，避免访客登录后去登录页走一圈回来状态过期
  useDidShow(() => {
    void refreshAuthState()
  })

  // 预热量取盒内层矩形：首触 hitTest 直接命中，不依赖 touchstart 时的异步回调
  useEffect(() => {
    const t = setTimeout(queryBoxRect, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoxId, boxes.length])

  useEffect(() => {
    const id = Number(router.params.id)
    void postAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/pages/giftbox/custom',
      target_type: id ? 'product' : undefined,
      target_id: id || undefined,
    }).catch(() => {})
    fetchGiftBoxes()
      .then((res) => {
        const items = (res.items || []).filter((b) => b.box_type === 'square')
        if (!items.length) return
        setBoxes(items)
        // 固定礼盒：直接取第一款方形启用礼盒，不再跟随 box_id
        setSelectedBoxId(items[0].id)
      })
      .catch(() => {})
    fetchGiftBoxGoods()
      .then((res) => {
        const items = res.items || []
        if (!items.length) return
        setOptions(
          items.map((item, index) => ({
            goodsId: item.id,
            id: item.id,
            name: item.name,
            summary: item.summary || item.product_summary || '文创好物',
            spec: item.spec || '',
            material: item.material || '',
            w: item.w,
            h: item.h,
            cells: item.w * item.h,
            price: item.price,
            color: item.color || PALETTE[index % PALETTE.length],
            productId: item.product_id ?? null,
            productSummary: item.product_summary || '',
            productName: item.product_name || '',
            productCover: item.product_cover_url || '',
          }))
        )
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usedCells = useMemo(() => usedOf(placed), [placed])
  // 进度展示钳制：永远不大于总格数
  const cappedUsed = Math.min(usedCells, CAPACITY)
  // 拖拽源商品（读 ref 即可，dragPos 变化会触发重渲染）
  const dragSrc = dragKey !== null ? placedRef.current.find((it) => it.key === dragKey) ?? null : null

  // 费用预览：固定方形礼盒，直接取方形第一款
  const priceBox = useMemo(() => {
    const squares = boxes.filter((b) => b.box_type === 'square')
    const picked = selectedBoxId != null ? squares.find((b) => b.id === selectedBoxId) : undefined
    return picked ?? squares[0] ?? boxes[0] ?? null
  }, [boxes, selectedBoxId])
  // 固定方形礼盒，不再跟随款式切换
  const boxType: BoxType = 'square'
  const goodsTotal = useMemo(
    () => Math.round(placed.reduce((sum, p) => sum + (p.price || 0), 0) * 100) / 100,
    [placed]
  )
  const packingFee = priceBox?.packing_fee ?? 0
  const totalPrice = Math.round((packingFee + goodsTotal) * 100) / 100
  const minPrice = priceBox?.min_price ?? 0
  const belowMin = placed.length > 0 && totalPrice < minPrice

  const buildLoginRedirect = () => '/pages/giftbox/custom'

  /** 未登录 / 访客拦截：弹窗提示“未登录无法使用此功能”，确认则清访客态并跳登录页 */
  const interceptGuest = async (): Promise<boolean> => {
    // true = 已拦截，调用方直接 return
    if (!isLoggedIn()) {
      const confirm = await Taro.showModal({
        title: '请先登录',
        content: '未登录无法使用此功能，是否前往登录？',
        confirmText: '去登录',
        cancelText: '稍后再说',
      })
      if (confirm.confirm) {
        goLoginPage(buildLoginRedirect())
      } else {
        Taro.showToast({ title: '未登录无法使用此功能', icon: 'none' })
      }
      return true
    }
    try {
      const me = await fetchMe()
      if (!isGuestUser(me)) {
        setAuthState('real')
        return false
      }
      setAuthState('guest')
    } catch {
      setAuthState('none')
      const confirm = await Taro.showModal({
        title: '请先登录',
        content: '未登录无法使用此功能，是否前往登录？',
        confirmText: '去登录',
        cancelText: '稍后再说',
      })
      if (confirm.confirm) {
        goLoginPage(buildLoginRedirect())
      } else {
        Taro.showToast({ title: '未登录无法使用此功能', icon: 'none' })
      }
      return true
    }
    const confirm = await Taro.showModal({
      title: '访客受限',
      content: '未登录无法使用此功能，访客身份不能保存礼盒，是否前往登录？',
      confirmText: '去登录',
      cancelText: '稍后再说',
    })
    if (confirm.confirm) {
      goLoginPage(buildLoginRedirect())
    } else {
      Taro.showToast({ title: '未登录无法使用此功能', icon: 'none' })
    }
    return true
  }

  const handleSave = async () => {
    if (!placed.length || saving) return
    if (belowMin) {
      Taro.showToast({ title: `未达到起售价${minPrice}元`, icon: 'none' })
      return
    }
    if (await interceptGuest()) return
    const confirm = await Taro.showModal({
      title: '确定保存礼盒',
      content: `${priceBox?.name ?? '礼盒'}：包装费${packingFee}元 + 商品${goodsTotal}元，预计总价${totalPrice}元`,
      confirmText: '确定保存',
    })
    if (!confirm.confirm) return
    setSaving(true)
    try {
      const res = await saveMyGiftBox({
        gift_box_id: priceBox && priceBox.id > 0 ? priceBox.id : null,
        box_type: boxType,
        items: placedRef.current.map((p) => ({ goods_id: p.goodsId, x: p.x, y: p.y })),
      })
      Taro.showToast({ title: `已保存，预计${res.total_price}元`, icon: 'success' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/giftbox/mine' }), 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败'
      // token 过期 / 被后端判定未登录：同样提示并跳登录页
      if (/401|missing_token|invalid_token|user_not_found|wrong_token_type/i.test(msg)) {
        const confirm = await Taro.showModal({
          title: '请先登录',
          content: '未登录无法使用此功能，是否前往登录？',
          confirmText: '去登录',
          cancelText: '稍后再说',
        })
        if (confirm.confirm) {
          goLoginPage(buildLoginRedirect())
        } else {
          Taro.showToast({ title: '未登录无法使用此功能', icon: 'none' })
        }
        return
      }
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = (opt: GiftOption) => {
    // 双重校验都基于 placedRef 实时值：校验与落子同一 tick 完成，连点必然看到最新占位
    if (usedOf(placedRef.current) + opt.cells > CAPACITY) {
      Taro.showToast({ title: '礼盒空间不足，无法继续添加', icon: 'none' })
      return
    }
    const slot = findSlot(buildOccupancy(placedRef.current), opt.w, opt.h)
    if (slot) {
      const key = keySeq.current++
      syncPlaced([...placedRef.current, { ...opt, key, x: slot.x, y: slot.y }])
      land(key)
      return
    }
    // 当前布局放不下：开着自动整理就全局重排腾位（按面积从大到小依次重放）
    if (autoArrange) {
      const key = keySeq.current++
      const fresh: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false))
      const candidates: PlacedItem[] = [
        ...placedRef.current,
        { ...opt, key, x: 0, y: 0 },
      ].sort((a, b) => b.cells - a.cells)
      const repacked: PlacedItem[] = []
      let fits = true
      for (const item of candidates) {
        const s = findSlot(fresh, item.w, item.h)
        if (!s) {
          fits = false
          break
        }
        for (let dy = 0; dy < item.h; dy++) {
          for (let dx = 0; dx < item.w; dx++) fresh[s.y + dy][s.x + dx] = true
        }
        repacked.push({ ...item, x: s.x, y: s.y })
      }
      if (fits) {
        syncPlaced(repacked)
        land(key)
        Taro.showToast({ title: '已自动整理腾出空间', icon: 'none' })
        return
      }
    }
    Taro.showToast({ title: '礼盒空间不足，无法继续添加', icon: 'none' })
  }

  const land = (key: number) => {
    // 直接在格内落定并播放入场弹出动画
    setJustLanded(key)
    setLidOpen(true)
    if (landTimer.current) clearTimeout(landTimer.current)
    landTimer.current = setTimeout(() => {
      setJustLanded((cur) => (cur === key ? null : cur))
    }, 650)
  }

  const handleRemove = (key: number) => {
    syncPlaced(placedRef.current.filter((p) => p.key !== key))
  }

  /** 拖拽换位：长按 280ms 进入，手指位置换算为目标格，松手落位 */

  const queryBoxRect = () => {
    try {
      Taro.createSelectorQuery()
        .select('.placed-layer')
        .boundingClientRect((rect) => {
          const r = Array.isArray(rect) ? rect[0] : rect
          if (r) {
            boxRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height }
          }
        })
        .exec()
    } catch {
      boxRectRef.current = null
    }
  }

  const cellFromTouch = (clientX: number, clientY: number, w: number, h: number) => {
    const rect = boxRectRef.current
    if (!rect || rect.width <= 0 || rect.height <= 0) return null
    const cellW = rect.width / GRID
    const cellH = rect.height / GRID
    const x = Math.round((clientX - rect.left) / cellW - w / 2)
    const y = Math.round((clientY - rect.top) / cellH - h / 2)
    return {
      x: Math.max(0, Math.min(GRID - w, x)),
      y: Math.max(0, Math.min(GRID - h, y)),
    }
  }

  const slotFreeExcept = (x: number, y: number, w: number, h: number, excludeKey: number) => {
    const grid = buildOccupancy(placedRef.current.filter((p) => p.key !== excludeKey))
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy][x + dx]) return false
      }
    }
    return true
  }

  /** 容器层触摸入口：手指落在幽灵框/空格子上时依然能接到事件 */
  const onLayerTouchStart = (e: any) => {
    const t = e.touches?.[0]
    if (!t) return
    const hit = hitTest(t.clientX, t.clientY)
    if (hit) beginPress(hit, e)
  }

  const onLayerTouchMove = (e: any) => {
    if (dragKey === null) return
    const p = placedRef.current.find((it) => it.key === dragKey)
    if (p) movePress(p, e)
  }

  const onLayerTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (dragKey === null) return
    const p = placedRef.current.find((it) => it.key === dragKey)
    if (p) endBlockTouch(p)
    else {
      // 拖拽源已被删：直接复位，避免拖拽态泄漏
      setDragKey(null)
      setDragPos(null)
    }
  }

  /** 按触点坐标反查命中的已放商品 */
  const hitTest = (clientX: number, clientY: number) => {
    const rect = boxRectRef.current
    if (!rect || rect.width <= 0 || rect.height <= 0) return null
    const cx = Math.floor((clientX - rect.left) / (rect.width / GRID))
    const cy = Math.floor((clientY - rect.top) / (rect.height / GRID))
    if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return null
    return (
      placedRef.current.find((p) => cx >= p.x && cx < p.x + p.w && cy >= p.y && cy < p.y + p.h) ??
      null
    )
  }

  const beginPress = (p: PlacedItem, e: any) => {
    const t = (e.touches?.[0] ?? null) as { clientX: number; clientY: number } | null
    pressXY.current = t ? { x: t.clientX, y: t.clientY } : null
    queryBoxRect()
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      setDragKey(p.key)
      setDragPos({ x: p.x, y: p.y })
      setDragValid(true)
      try {
        Taro.vibrateShort()
      } catch {
        /* 无震动反馈则忽略 */
      }
    }, 280)
  }

  const movePress = (p: PlacedItem, e: any) => {
    const t = e.touches?.[0]
    if (!t) return
    if (dragKey !== p.key) {
      // 未进入拖拽：手指滑动超阈值则取消长按判定
      const start = pressXY.current
      if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 12) {
        if (pressTimer.current) {
          clearTimeout(pressTimer.current)
          pressTimer.current = null
        }
      }
      return
    }
    const pos = cellFromTouch(t.clientX, t.clientY, p.w, p.h)
    if (!pos) return
    setDragPos(pos)
    setDragValid(slotFreeExcept(pos.x, pos.y, p.w, p.h, p.key))
  }

  const endBlockTouch = (p: PlacedItem) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressXY.current = null
    if (dragKey !== p.key) return
    // 本次是拖拽：吞掉随后触发的 click，避免误触取出 / 误触盒盖
    suppressClickRef.current = true
    if (dragPos && dragValid) {
      syncPlaced(
        placedRef.current.map((it) => (it.key === p.key ? { ...it, x: dragPos.x, y: dragPos.y } : it))
      )
    }
    setDragKey(null)
    setDragPos(null)
  }

  const handleClear = () => {
    if (landTimer.current) {
      clearTimeout(landTimer.current)
      landTimer.current = null
    }
    setJustLanded(null)
    if (!placedRef.current.length) return
    syncPlaced([])
    Taro.showToast({ title: '已清空礼盒', icon: 'none' })
  }

  return (
    <View className='gift-page'>
      <View className='gift-topbar'>
        <Text className='back active-scale' onClick={() => navigateBackOrRelaunch('/pages/index/index')}>返回</Text>
        <Text className='gift-title'>方形礼盒选配</Text>
        <Text className='gift-cap'>{cappedUsed}/{CAPACITY}格</Text>
      </View>

      {/* 访客 / 未登录前置提示：允许继续搭配，点击保存时再拦截跳登录 */}
      {(authState === 'guest' || authState === 'none') && (
        <View className='auth-tip-row'>
          <Text className='auth-tip-text'>
            {authState === 'guest' ? '当前为访客身份，未登录无法使用保存功能' : '当前未登录，保存礼盒需要先登录'}
          </Text>
          <Text className='auth-tip-btn' onClick={() => goLoginPage(buildLoginRedirect())}>
            去登录
          </Text>
        </View>
      )}

      {/* 上半区：礼盒可视化预览 */}
      <View className='preview-zone'>
        <View className='auto-row'>
          <Text className='auto-label'>自动整理（加不进时重排腾位）</Text>
          <Switch className='auto-switch' checked={autoArrange} onChange={(e) => setAutoArrange(e.detail.value)} />
        </View>
        {priceBox && (
          <View className='picked-box-row'>
            <Text className='picked-box-text'>
              当前：{priceBox.name}（固定方形） · 包装费¥{packingFee} · 起售¥{minPrice}
            </Text>
          </View>
        )}

        <View
          className={`box-stage ${boxType}`}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false
              return
            }
            setLidOpen((v) => !v)
          }}
        >
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
            {/* 触摸统一由容器层接收 + catchTouchMove 截断冒泡，拖拽时页面不再被带跑 */}
            <View
              className='placed-layer'
              onTouchStart={onLayerTouchStart}
              onTouchMove={onLayerTouchMove}
              onTouchEnd={onLayerTouchEnd}
              onTouchCancel={onLayerTouchEnd}
              // catchMove 切到 catch-view 模板截住 touchmove 冒泡，拖拽时页面不再被带跑；
              // 静态常开（盒子是交互画布），下方商品列表是兄弟节点，滚动不受影响
              catchMove
            >
              {placed.map((p) => (
                <View
                  key={p.key}
                  className={`gift-block${justLanded === p.key ? ' land' : ''}${dragKey === p.key ? ' dragging' : ''}`}
                  style={{
                    left: `${(p.x / GRID) * 100}%`,
                    top: `${(p.y / GRID) * 100}%`,
                    width: `${(p.w / GRID) * 100}%`,
                    height: `${(p.h / GRID) * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false
                      return
                    }
                    handleRemove(p.key)
                  }}
                >
                  <View
                    className='gift-block-inner'
                    style={{
                      background: p.color,
                      // 固定方形礼盒：直角展示
                      borderRadius: undefined,
                    }}
                  >
                    <Text className='gb-name'>{p.name}</Text>
                    <Text className='gb-size'>{p.w}×{p.h}</Text>
                  </View>
                </View>
              ))}
              {/* 拖拽目标幽灵预览：有效为茶色虚线框，无效为红色 */}
              {dragSrc && dragPos && (
                <View
                  className={`drag-ghost${dragValid ? '' : ' invalid'}`}
                  style={{
                    left: `${(dragPos.x / GRID) * 100}%`,
                    top: `${(dragPos.y / GRID) * 100}%`,
                    width: `${(dragSrc.w / GRID) * 100}%`,
                    height: `${(dragSrc.h / GRID) * 100}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Text className='drag-ghost-text'>{dragValid ? '松手放置' : '此处放不下'}</Text>
                </View>
              )}
            </View>
            {placed.length === 0 && (
              <View className='box-empty'>
                <Text className='box-empty-t'>点击下方商品加入礼盒</Text>
                <Text className='box-empty-s'>点击取出 · 长按拖动换位</Text>
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
      </View>

      {/* 下半区：商品选择列表 */}
      <ScrollView scrollY className='goods-list'>
        {options.map((opt) => {
          const disabled = usedCells + opt.cells > CAPACITY
          return (
            <View key={opt.id} className='goods-card'>
              <View className='swatch' style={{ background: opt.color }}>
                <Text className='swatch-size'>{opt.w}×{opt.h}</Text>
              </View>
              <View className='goods-info'>
                <Text className='goods-name'>{opt.name}</Text>
                <Text className='goods-desc'>介绍：{opt.summary}</Text>
                {(opt.spec || opt.material) && (
                  <Text className='goods-desc spec'>尺寸：{opt.spec || '—'} · 材质：{opt.material || '—'}</Text>
                )}
                {opt.productSummary && opt.productSummary !== opt.summary ? (
                  <Text className='goods-desc sub'>关联商品{opt.productName ? `「${opt.productName}」` : ''}：{opt.productSummary}</Text>
                ) : null}
                <Text className='goods-slot'>占位 {opt.w}×{opt.h}（共{opt.cells}格）</Text>
                <Text className='goods-price'>¥{opt.price}</Text>
                <View className='goods-links'>
                  <Text
                    className='goods-link'
                    onClick={() =>
                      Taro.showModal({
                        title: opt.name,
                        content: `${opt.summary}${opt.spec ? `\n尺寸：${opt.spec}` : ''}${opt.material ? `\n材质：${opt.material}` : ''}${opt.productSummary && opt.productSummary !== opt.summary ? `\n\n关联商品：${opt.productSummary}` : ''}\n\n占位 ${opt.w}×${opt.h}（共${opt.cells}格）· ¥${opt.price}`,
                        showCancel: false,
                        confirmText: '知道了',
                      })
                    }
                  >
                    查看详情
                  </Text>
                  {opt.productId ? (
                    <Text
                      className='goods-link'
                      onClick={() => Taro.navigateTo({ url: `/pages/product/detail?id=${opt.productId}` })}
                    >
                      关联商品 ›
                    </Text>
                  ) : null}
                </View>
              </View>
              <Button
                className={`add-btn ${disabled ? 'disabled' : ''}`}
                disabled={disabled}
                onClick={() => handleAdd(opt)}
              >
                添加
              </Button>
            </View>
          )
        })}
        <View className='list-pad' />
      </ScrollView>

      {/* 底部费用预览 + 确定保存 */}
      <View className='price-bar'>
        <View className='price-info'>
          <Text className='price-line'>包装费 ¥{packingFee} + 商品 ¥{goodsTotal}</Text>
          <Text className='price-total'>预计 ¥{totalPrice}{minPrice > 0 ? `（起售¥${minPrice}）` : ''}</Text>
          {belowMin && <Text className='price-warn'>未达起售价，再选一点吧</Text>}
        </View>
        <Button
          type='primary'
          className='save-btn'
          disabled={!placed.length || belowMin || saving}
          loading={saving}
          onClick={handleSave}
        >
          {authState === 'guest' || authState === 'none' ? '登录后保存' : '确定保存'}
        </Button>
      </View>
    </View>
  )
}
