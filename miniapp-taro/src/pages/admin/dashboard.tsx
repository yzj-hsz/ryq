import { useEffect, useMemo, useState } from 'react'
import { View, Text, Button, Input, Textarea, ScrollView, Switch, Picker, Image } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import {
  createAdminItem,
  deleteAdminItem,
  deleteUser,
  fetchAdminDetail,
  fetchAdminList,
  fetchAdminSummary,
  fetchAnalyticsEvents,
  fetchColorCardOptions,
  fetchColorCardPresets,
  fetchCulturePromo,
  fetchHomeIntroText,
  fetchProductDetail,
  fetchProductList,
  fetchSiteConfig,
  fetchUploads,
  fetchUserDiyRecords,
  fetchUserList,
  fetchUserTasks,
  getAssetUrl,
  saveCulturePromo,
  saveHomeIntroText,
  saveSiteConfig,
  updateAdminItem,
  updateUserRole,
  updateUserTask,
  uploadAdminLocalFile,
  type AdminCrudItem,
  type AdminSummary,
  type AdminUploadItem,
  type AdminUserDiyRecord,
  type AdminUserItem,
  type AdminUserTask,
  type AnalyticsEventItem,
  type ColorCardDimension,
  type ColorCardPreset,
} from '@/api/admin'
import { clearAdminProfile, clearAdminToken, getAdminProfile, isAdminLoggedIn } from '@/utils/auth'
import './dashboard.scss'

type MenuKey =
  | 'dashboard'
  | 'analytics'
  | 'home-videos'
  | 'home-ppts'
  | 'home-intro-text'
  | 'home-banners'
  | 'home-highlights'
  | 'products'
  | 'culture-promo'
  | 'culture-articles'
  | 'experiences'
  | 'task-showcases'
  | 'color-card'
  | 'media'
  | 'user-tasks'
  | 'user-diy'
  | 'users'
  | 'site-config'

type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'image' | 'video'

interface FieldConfig {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  help?: string
}

interface CrudConfig {
  key: MenuKey
  title: string
  description: string
  listPath: string
  detailPath?: string
  createPath: string
  updatePath: string
  deletePath: string
  columns: Array<{ key: string; label: string }>
  fields: FieldConfig[]
}

const menuGroups: Array<{ title: string; items: Array<{ key: MenuKey; label: string }> }> = [
  {
    title: '用户权限',
    items: [
      { key: 'users', label: '用户管理' },
    ],
  },
  {
    title: '总览',
    items: [
      { key: 'dashboard', label: '工作台' },
      { key: 'analytics', label: '埋点分析' },
    ],
  },
  {
    title: '首页管理',
    items: [
      { key: 'home-videos', label: '首页视频' },
      { key: 'home-ppts', label: '首页PPT' },
      { key: 'home-intro-text', label: '首页图文' },
      { key: 'home-banners', label: '精选推荐' },
      { key: 'home-highlights', label: '项目亮点' },
    ],
  },
  {
    title: '认识饶平',
    items: [
      { key: 'culture-promo', label: '宣传视频' },
      { key: 'culture-articles', label: '文化图文' },
    ],
  },
  {
    title: '内容管理',
    items: [
      { key: 'products', label: '商品管理' },
      { key: 'experiences', label: '体验项目' },
      { key: 'task-showcases', label: '茶染任务' },
      { key: 'color-card', label: '色卡工具' },
      { key: 'media', label: '媒体库' },
    ],
  },
  {
    title: '审核配置',
    items: [
      { key: 'user-tasks', label: '任务审核' },
      { key: 'user-diy', label: 'DIY记录' },
      { key: 'site-config', label: '站点配置' },
    ],
  },
]

const quickModules: Array<{ title: string; desc: string; key: MenuKey }> = [
  { title: '首页管理', desc: '轮播、PPT、推荐位、项目亮点', key: 'home-banners' },
  { title: '认识饶平', desc: '宣传区与文化图文统一管理', key: 'culture-promo' },
  { title: '商品管理', desc: '商品、匠心手作、图文详情', key: 'products' },
  { title: '用户管理', desc: '管理注册用户、分配角色权限', key: 'users' },
  { title: '任务审核', desc: '茶染任务、DIY记录、用户提交', key: 'user-tasks' },
]

const SUMMARY_ITEMS: Array<{ key: keyof AdminSummary; label: string }> = [
  { key: 'total_users', label: '总用户数' },
  { key: 'new_users_today', label: '今日新增' },
  { key: 'today_pv', label: '今日 PV' },
  { key: 'today_uv', label: '今日 UV' },
  { key: 'total_want_clicks', label: '我想要点击' },
  { key: 'total_color_card_uses', label: '色卡使用' },
]

const EMPTY_SUMMARY: AdminSummary = {
  total_users: 0,
  new_users_today: 0,
  today_pv: 0,
  today_uv: 0,
  total_want_clicks: 0,
  total_color_card_uses: 0,
}

const genericConfigs: CrudConfig[] = [
  {
    key: 'home-videos',
    title: '首页视频管理',
    description: '管理首页视频轮播，支持视频地址、封面、启用状态和排序。',
    listPath: '/home/videos',
    createPath: '/home/videos',
    updatePath: '/home/videos/:id',
    deletePath: '/home/videos/:id',
    columns: [
      { key: 'title', label: '标题' },
      { key: 'video_url', label: '视频地址' },
      { key: 'sort_order', label: '排序' },
      { key: 'is_active', label: '启用' },
    ],
    fields: [
      { key: 'title', label: '标题', type: 'text', placeholder: '请输入视频标题' },
      { key: 'video_url', label: '视频文件', type: 'video' },
      { key: 'cover_url', label: '封面图片', type: 'image' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
  {
    key: 'home-ppts',
    title: '首页 PPT 管理',
    description: '管理首页 PPT 图片轮播，支持本地上传、排序和启用。',
    listPath: '/home/ppts',
    createPath: '/home/ppts',
    updatePath: '/home/ppts/:id',
    deletePath: '/home/ppts/:id',
    columns: [
      { key: 'title', label: '标题' },
      { key: 'image_url', label: '图片地址' },
      { key: 'sort_order', label: '排序' },
      { key: 'is_active', label: '启用' },
    ],
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'image_url', label: 'PPT 图片', type: 'image' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
  {
    key: 'home-banners',
    title: '精选推荐管理',
    description: '管理首页精选推荐卡片，可设置图片、详情、跳转类型和排序。',
    listPath: '/home/banners',
    createPath: '/home/banners',
    updatePath: '/home/banners/:id',
    deletePath: '/home/banners/:id',
    columns: [
      { key: 'title', label: '标题' },
      { key: 'link_type', label: '跳转类型' },
      { key: 'sort_order', label: '排序' },
      { key: 'is_active', label: '启用' },
    ],
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'image_url', label: '推荐图片', type: 'image' },
      { key: 'detail_html', label: '详情文案', type: 'textarea' },
      {
        key: 'link_type',
        label: '跳转类型',
        type: 'select',
        options: [
          { label: '无', value: 'none' },
          { label: '小程序页面', value: 'miniprogram_page' },
          { label: 'H5', value: 'h5' },
          { label: '详情页', value: 'detail' },
        ],
      },
      { key: 'link_value', label: '跳转值', type: 'text' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
  {
    key: 'home-highlights',
    title: '项目亮点管理',
    description: '管理首页项目亮点卡片与详情内容。',
    listPath: '/home/highlights',
    createPath: '/home/highlights',
    updatePath: '/home/highlights/:id',
    deletePath: '/home/highlights/:id',
    columns: [
      { key: 'icon', label: '图标' },
      { key: 'title', label: '标题' },
      { key: 'summary', label: '摘要' },
      { key: 'sort_order', label: '排序' },
    ],
    fields: [
      { key: 'icon', label: '图标', type: 'text', placeholder: '例如 icon-home 或文本图标' },
      { key: 'title', label: '标题', type: 'text' },
      { key: 'summary', label: '摘要', type: 'textarea' },
      { key: 'image_url', label: '亮点图片', type: 'image' },
      { key: 'detail_html', label: '详情文案', type: 'textarea' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
  {
    key: 'culture-articles',
    title: '文化图文管理',
    description: '管理认识饶平中的文化图文文章列表和详情。',
    listPath: '/culture/articles',
    detailPath: '/culture/articles/:id',
    createPath: '/culture/articles',
    updatePath: '/culture/articles/:id',
    deletePath: '/culture/articles/:id',
    columns: [
      { key: 'title', label: '标题' },
      { key: 'category', label: '分类' },
      { key: 'status', label: '状态' },
      { key: 'sort_order', label: '排序' },
    ],
    fields: [
      {
        key: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '非遗', value: 'heritage' },
          { label: '文旅', value: 'travel' },
          { label: '综合', value: 'general' },
        ],
      },
      { key: 'title', label: '标题', type: 'text' },
      { key: 'cover_url', label: '封面图', type: 'image' },
      { key: 'summary', label: '摘要', type: 'textarea' },
      { key: 'body_html', label: '正文文案', type: 'textarea' },
      { key: 'list_no', label: '列表编号', type: 'number' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '已发布', value: 'published' },
          { label: '草稿', value: 'draft' },
        ],
      },
    ],
  },
  {
    key: 'experiences',
    title: '体验项目管理',
    description: '管理玩转饶平中的深圳体验和饶平体验内容。',
    listPath: '/experiences',
    detailPath: '/experiences/:id',
    createPath: '/experiences',
    updatePath: '/experiences/:id',
    deletePath: '/experiences/:id',
    columns: [
      { key: 'name', label: '名称' },
      { key: 'region', label: '地区' },
      { key: 'status', label: '状态' },
      { key: 'sort_order', label: '排序' },
    ],
    fields: [
      {
        key: 'region',
        label: '地区',
        type: 'select',
        options: [
          { label: '深圳体验', value: 'shenzhen' },
          { label: '饶平体验', value: 'raoping' },
        ],
      },
      { key: 'name', label: '名称', type: 'text' },
      { key: 'cover_url', label: '封面图', type: 'image' },
      { key: 'location', label: '地点', type: 'text' },
      { key: 'time_note', label: '时间说明', type: 'text' },
      { key: 'duration_note', label: '时长说明', type: 'text' },
      { key: 'badge', label: '徽标文案', type: 'text' },
      { key: 'badge_color', label: '徽标颜色', type: 'text', placeholder: '#b8763e' },
      { key: 'summary', label: '简介', type: 'textarea' },
      { key: 'flow_text', label: '体验流程', type: 'textarea' },
      { key: 'value_text', label: '非遗价值', type: 'textarea' },
      { key: 'notice_html', label: '注意事项文案', type: 'textarea' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '已发布', value: 'published' },
          { label: '草稿', value: 'draft' },
        ],
      },
    ],
  },
  {
    key: 'task-showcases',
    title: '茶染任务管理',
    description: '管理扶残助残中的茶染任务卡片和任务详情。',
    listPath: '/task-showcases',
    detailPath: '/task-showcases/:id',
    createPath: '/task-showcases',
    updatePath: '/task-showcases/:id',
    deletePath: '/task-showcases/:id',
    columns: [
      { key: 'name', label: '任务名称' },
      { key: 'category', label: '分类' },
      { key: 'status_label', label: '状态标签' },
      { key: 'sort_order', label: '排序' },
    ],
    fields: [
      { key: 'name', label: '任务名称', type: 'text' },
      { key: 'category', label: '分类', type: 'text', placeholder: '例如 teadye' },
      { key: 'cover_url', label: '封面图', type: 'image' },
      { key: 'difficulty', label: '难度', type: 'text' },
      { key: 'deadline_note', label: '截止说明', type: 'text' },
      { key: 'status_label', label: '状态标签', type: 'text' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'requirement', label: '要求', type: 'textarea' },
      { key: 'process_text', label: '流程文案', type: 'textarea' },
      { key: 'materials', label: '材料说明', type: 'textarea' },
      { key: 'reference_image_url', label: '参考图', type: 'image' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
]

export default function AdminDashboardPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')
  const [refreshTick, setRefreshTick] = useState(0)

  const admin = useMemo(() => getAdminProfile(), [])
  const displayName = admin?.display_name || admin?.username || '管理员'

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      Taro.reLaunch({ url: '/pages/admin/login' })
    }
  }, [])

  usePullDownRefresh(() => {
    setRefreshTick((tick) => tick + 1)
  })

  const onLogout = async () => {
    const res = await Taro.showModal({
      title: '退出管理端',
      content: '退出后将返回登录首页，是否继续？',
    })
    if (!res.confirm) return
    clearAdminToken()
    clearAdminProfile()
    Taro.reLaunch({ url: '/pages/login/login' })
  }

  return (
    <View className='admin-dashboard-page'>
      <View className='hero-card'>
        <Text className='hero-title'>管理台 v1.2</Text>
        <Text className='hero-subtitle'>欢迎你，{displayName}</Text>
        <Text className='hero-desc'>已接入用户权限管理、内容管理、任务审核及埋点分析功能。</Text>
        <View className='hero-actions'>
          <Button className='secondary-btn small-btn' onClick={() => setRefreshTick((tick) => tick + 1)}>刷新当前模块</Button>
          <Button className='ghost-btn small-btn' onClick={onLogout}>退出登录</Button>
        </View>
      </View>
      {menuGroups.map((group) => (
        <View className='menu-group' key={group.title}>
          <Text className='menu-title'>{group.title}</Text>
          <ScrollView scrollX className='menu-scroll'>
            <View className='menu-row'>
              {group.items.map((item) => (
                <View
                  key={item.key}
                  className={`menu-chip ${activeMenu === item.key ? 'active' : ''}`}
                  onClick={() => setActiveMenu(item.key)}
                >
                  <Text className={`menu-chip-text ${activeMenu === item.key ? 'active' : ''}`}>{item.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
      <SectionRenderer activeMenu={activeMenu} refreshTick={refreshTick} onJump={setActiveMenu} />
    </View>
  )
}

function SectionRenderer({
  activeMenu,
  refreshTick,
  onJump,
}: {
  activeMenu: MenuKey
  refreshTick: number
  onJump: (key: MenuKey) => void
}) {
  const genericConfig = genericConfigs.find((item) => item.key === activeMenu)
  if (genericConfig) return <GenericCrudSection config={genericConfig} refreshTick={refreshTick} />
  if (activeMenu === 'dashboard') return <DashboardOverviewSection refreshTick={refreshTick} onJump={onJump} />
  if (activeMenu === 'analytics') return <AnalyticsSection refreshTick={refreshTick} />
  if (activeMenu === 'home-intro-text') return <HomeIntroTextSection refreshTick={refreshTick} />
  if (activeMenu === 'culture-promo') return <CulturePromoSection refreshTick={refreshTick} />
  if (activeMenu === 'products') return <ProductSection refreshTick={refreshTick} />
  if (activeMenu === 'color-card') return <ColorCardSection refreshTick={refreshTick} />
  if (activeMenu === 'media') return <MediaLibrarySection refreshTick={refreshTick} />
  if (activeMenu === 'user-tasks') return <UserTasksSection refreshTick={refreshTick} />
  if (activeMenu === 'user-diy') return <UserDiySection refreshTick={refreshTick} />
  if (activeMenu === 'users') return <UserManagementSection refreshTick={refreshTick} />
  if (activeMenu === 'site-config') return <SiteConfigSection refreshTick={refreshTick} />
  return null
}

function DashboardOverviewSection({ refreshTick, onJump }: { refreshTick: number; onJump: (key: MenuKey) => void }) {
  const [summary, setSummary] = useState<AdminSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)

  const loadSummary = async () => {
    setLoading(true)
    try {
      const res = await fetchAdminSummary()
      setSummary(res.summary || EMPTY_SUMMARY)
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    loadSummary()
  }, [refreshTick])

  return (
    <View className='section-card'>
      <SectionHeader title='经营概览' description='查看当前小程序核心运营数据，并快捷进入常用管理模块。' />
      <View className='summary-grid'>
        {SUMMARY_ITEMS.map((item) => (
          <View className='summary-item' key={item.key}>
            <Text className='summary-value'>{loading ? '...' : String(summary[item.key] ?? 0)}</Text>
            <Text className='summary-label'>{item.label}</Text>
          </View>
        ))}
      </View>
      <View className='module-list'>
        {quickModules.map((item) => (
          <View className='module-item' key={item.key} onClick={() => onJump(item.key)}>
            <Text className='module-title'>{item.title}</Text>
            <Text className='module-desc'>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function GenericCrudSection({ config, refreshTick }: { config: CrudConfig; refreshTick: number }) {
  const [rows, setRows] = useState<AdminCrudItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, any>>(initialForm(config.fields, {}))
  const [saving, setSaving] = useState(false)

  const loadRows = async () => {
    setLoading(true)
    try {
      const res = await fetchAdminList<AdminCrudItem>(config.listPath)
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(initialForm(config.fields, {}))
    loadRows()
  }, [config.key, refreshTick])

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return rows
    const text = keyword.trim().toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(text))
  }, [rows, keyword])

  const openCreate = () => {
    setEditingId(null)
    setForm(initialForm(config.fields, {}))
    setShowForm(true)
  }

  const openEdit = async (row: AdminCrudItem) => {
    try {
      const detail = config.detailPath
        ? await fetchAdminDetail<Record<string, unknown>>(replaceId(config.detailPath, row.id))
        : row
      setEditingId(row.id)
      setForm(initialForm(config.fields, detail as Record<string, unknown>))
      setShowForm(true)
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const payload = serializeForm(config.fields, form)
      if (editingId) await updateAdminItem(replaceId(config.updatePath, editingId), payload)
      else await createAdminItem(config.createPath, payload)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setShowForm(false)
      setEditingId(null)
      await loadRows()
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: AdminCrudItem) => {
    const ok = await confirmAction('删除确认', `确定删除「${String(row.title || row.name || row.id)}」吗？`)
    if (!ok) return
    try {
      await deleteAdminItem(replaceId(config.deletePath, row.id))
      Taro.showToast({ title: '已删除', icon: 'success' })
      await loadRows()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title={config.title} description={config.description} />
      <View className='action-row'>
        <Input className='search-input' value={keyword} placeholder='搜索标题或关键词' onInput={(e) => setKeyword(e.detail.value)} />
        <Button className='primary-btn inline-btn' onClick={openCreate}>新增</Button>
      </View>
      {showForm ? (
        <View className='editor-card'>
          <Text className='editor-title'>{editingId ? '编辑内容' : '新增内容'}</Text>
          {config.fields.map((field) => (
            <FieldEditor
              key={field.key}
              field={field}
              value={form[field.key]}
              onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}
          <View className='editor-actions'>
            <Button className='ghost-btn inline-btn' onClick={() => setShowForm(false)}>取消</Button>
            <Button className='primary-btn inline-btn' loading={saving} onClick={onSave}>保存</Button>
          </View>
        </View>
      ) : null}
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && filteredRows.length === 0 ? <EmptyHint text='暂无数据' /> : null}
        {filteredRows.map((row) => (
          <View className='data-card' key={row.id}>
            {findCoverUrl(row) ? <Image className='data-card-cover' src={getAssetUrl(findCoverUrl(row))} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{String(row.title || row.name || `#${row.id}`)}</Text>
            {config.columns.map((column) => (
              <Text className='data-card-line' key={column.key}>
                {column.label}：{formatValue(row[column.key])}
              </Text>
            ))}
            <View className='editor-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => openEdit(row)}>编辑</Button>
              <Button className='danger-btn inline-btn' onClick={() => onDelete(row)}>删除</Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function HomeIntroTextSection({ refreshTick }: { refreshTick: number }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchHomeIntroText()
      setText(res.text || '')
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const save = async () => {
    try {
      await saveHomeIntroText(text)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='首页图文介绍' description='后台只需输入纯文本，前端自动套用统一图文模板。' />
      <Textarea className='large-textarea' value={text} autoHeight onInput={(e) => setText(e.detail.value)} />
      <View className='editor-actions'>
        <Button className='primary-btn inline-btn' loading={loading} onClick={save}>保存首页图文</Button>
      </View>
    </View>
  )
}

function CulturePromoSection({ refreshTick }: { refreshTick: number }) {
  const [form, setForm] = useState<Record<string, any>>({ title: '', subtitle: '', cover_url: '', video_url: '' })

  const load = async () => {
    try {
      const res = await fetchCulturePromo()
      setForm({ title: res.title || '', subtitle: res.subtitle || '', cover_url: res.cover_url || '', video_url: res.video_url || '' })
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const save = async () => {
    try {
      await saveCulturePromo(form)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='认识饶平宣传视频' description='管理宣传视频封面区与标题文案。' />
      <FieldEditor field={{ key: 'title', label: '标题', type: 'text' }} value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
      <FieldEditor field={{ key: 'subtitle', label: '副标题', type: 'textarea' }} value={form.subtitle} onChange={(value) => setForm((prev) => ({ ...prev, subtitle: value }))} />
      <FieldEditor field={{ key: 'cover_url', label: '封面图', type: 'image' }} value={form.cover_url} onChange={(value) => setForm((prev) => ({ ...prev, cover_url: value }))} />
      <FieldEditor field={{ key: 'video_url', label: '视频', type: 'video' }} value={form.video_url} onChange={(value) => setForm((prev) => ({ ...prev, video_url: value }))} />
      <View className='editor-actions'>
        <Button className='primary-btn inline-btn' onClick={save}>保存宣传区</Button>
      </View>
    </View>
  )
}

function ProductSection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<AdminCrudItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, any>>(emptyProduct())

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchProductList()
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyProduct())
    load()
  }, [refreshTick])

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return rows
    const text = keyword.trim().toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(text))
  }, [rows, keyword])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyProduct())
    setShowForm(true)
  }

  const openEdit = async (row: AdminCrudItem) => {
    try {
      const detail = await fetchProductDetail(row.id)
      setEditingId(row.id)
      setForm({
        ...emptyProduct(),
        ...detail,
        flow_steps: Array.isArray(detail.flow_steps) ? detail.flow_steps : [],
        gallery: Array.isArray(detail.gallery) ? detail.gallery : [],
      })
      setShowForm(true)
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const save = async () => {
    const payload = {
      ...form,
      sort_order: Number(form.sort_order || 0),
      gallery: (form.gallery || []).map((item: Record<string, any>, index: number) => ({
        url: item.url,
        sort_order: Number(item.sort_order ?? index),
      })),
      flow_steps: (form.flow_steps || []).map((item: Record<string, any>, index: number) => ({
        step_order: Number(item.step_order ?? index + 1),
        image_url: item.image_url,
        caption: item.caption,
      })),
    }
    try {
      if (editingId) await updateAdminItem(`/products/${editingId}`, payload)
      else await createAdminItem('/products', payload)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const remove = async (row: AdminCrudItem) => {
    const ok = await confirmAction('删除商品', `确定删除「${String(row.name || row.id)}」吗？`)
    if (!ok) return
    try {
      await deleteAdminItem(`/products/${row.id}`)
      Taro.showToast({ title: '已删除', icon: 'success' })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const updateGallery = (index: number, patch: Record<string, unknown>) => {
    const gallery = [...(form.gallery || [])]
    gallery[index] = { ...gallery[index], ...patch }
    setForm((prev) => ({ ...prev, gallery }))
  }

  const updateFlowStep = (index: number, patch: Record<string, unknown>) => {
    const flowSteps = [...(form.flow_steps || [])]
    flowSteps[index] = { ...flowSteps[index], ...patch }
    setForm((prev) => ({ ...prev, flow_steps: flowSteps }))
  }

  return (
    <View className='section-card'>
      <SectionHeader title='商品管理' description='支持商品基础信息、图集、工序图示和二维码配置。' />
      <View className='action-row'>
        <Input className='search-input' value={keyword} placeholder='搜索商品名、类型、分类' onInput={(e) => setKeyword(e.detail.value)} />
        <Button className='primary-btn inline-btn' onClick={openCreate}>新增</Button>
      </View>
      {showForm ? (
        <View className='editor-card'>
          <Text className='editor-title'>{editingId ? '编辑商品' : '新增商品'}</Text>
          <FieldEditor field={{ key: 'name', label: '商品名称', type: 'text' }} value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <FieldEditor field={{ key: 'summary', label: '商品简介', type: 'textarea' }} value={form.summary} onChange={(value) => setForm((prev) => ({ ...prev, summary: value }))} />
          <FieldEditor field={{ key: 'producer', label: '出品方', type: 'text' }} value={form.producer} onChange={(value) => setForm((prev) => ({ ...prev, producer: value }))} />
          <FieldEditor field={{ key: 'origin', label: '产地', type: 'text' }} value={form.origin} onChange={(value) => setForm((prev) => ({ ...prev, origin: value }))} />
          <FieldEditor
            field={{
              key: 'product_type',
              label: '商品类型',
              type: 'select',
              options: [
                { label: '礼盒', value: '礼盒' },
                { label: '助农', value: '助农' },
                { label: '匠心', value: '匠心' },
              ],
            }}
            value={form.product_type}
            onChange={(value) => setForm((prev) => ({ ...prev, product_type: value }))}
          />
          <FieldEditor
            field={{
              key: 'list_category',
              label: '列表分类',
              type: 'select',
              options: [
                { label: '礼盒定制 brand', value: 'brand' },
                { label: '联农助农 farm', value: 'farm' },
                { label: '扶残助残 assist', value: 'assist' },
                { label: '匠心手作 handmade', value: 'handmade' },
              ],
            }}
            value={form.list_category}
            onChange={(value) => setForm((prev) => ({ ...prev, list_category: value }))}
          />
          <FieldEditor field={{ key: 'primary_category', label: '一级分类', type: 'text' }} value={form.primary_category} onChange={(value) => setForm((prev) => ({ ...prev, primary_category: value }))} />
          <FieldEditor field={{ key: 'cover_url', label: '商品封面图', type: 'image' }} value={form.cover_url} onChange={(value) => setForm((prev) => ({ ...prev, cover_url: value }))} />
          <FieldEditor field={{ key: 'sort_order', label: '排序值', type: 'number' }} value={form.sort_order} onChange={(value) => setForm((prev) => ({ ...prev, sort_order: value }))} />
          <FieldEditor
            field={{
              key: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '已发布', value: 'published' },
                { label: '草稿', value: 'draft' },
                { label: '归档', value: 'archived' },
              ],
            }}
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
          />
          <FieldEditor field={{ key: 'process_text', label: '制作流程文本', type: 'textarea' }} value={form.process_text} onChange={(value) => setForm((prev) => ({ ...prev, process_text: value }))} />
          <FieldEditor field={{ key: 'detail_html', label: '详情文案', type: 'textarea' }} value={form.detail_html} onChange={(value) => setForm((prev) => ({ ...prev, detail_html: value }))} />
          <FieldEditor field={{ key: 'qr_code_url', label: '我想要二维码', type: 'image' }} value={form.qr_code_url} onChange={(value) => setForm((prev) => ({ ...prev, qr_code_url: value }))} />
          <Text className='subsection-title'>图集管理</Text>
          {(form.gallery || []).map((item: Record<string, any>, index: number) => (
            <View className='array-card' key={`gallery-${index}`}>
              <Text className='array-card-title'>图集 #{index + 1}</Text>
              <FieldEditor field={{ key: 'url', label: '图片', type: 'image' }} value={item.url} onChange={(value) => updateGallery(index, { url: value })} />
              <FieldEditor field={{ key: 'sort_order', label: '排序', type: 'number' }} value={item.sort_order} onChange={(value) => updateGallery(index, { sort_order: value })} />
              <Button className='danger-btn inline-btn' onClick={() => setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_: unknown, idx: number) => idx !== index) }))}>删除图集</Button>
            </View>
          ))}
          <Button className='secondary-btn inline-btn full-btn' onClick={() => setForm((prev) => ({ ...prev, gallery: [...prev.gallery, { url: '', sort_order: prev.gallery.length }] }))}>新增图集图片</Button>
          <Text className='subsection-title'>工序图示</Text>
          {(form.flow_steps || []).map((item: Record<string, any>, index: number) => (
            <View className='array-card' key={`step-${index}`}>
              <Text className='array-card-title'>工序步骤 #{index + 1}</Text>
              <FieldEditor field={{ key: 'step_order', label: '步骤序号', type: 'number' }} value={item.step_order} onChange={(value) => updateFlowStep(index, { step_order: value })} />
              <FieldEditor field={{ key: 'image_url', label: '工序图片', type: 'image' }} value={item.image_url} onChange={(value) => updateFlowStep(index, { image_url: value })} />
              <FieldEditor field={{ key: 'caption', label: '说明文字', type: 'text' }} value={item.caption} onChange={(value) => updateFlowStep(index, { caption: value })} />
              <Button className='danger-btn inline-btn' onClick={() => setForm((prev) => ({ ...prev, flow_steps: prev.flow_steps.filter((_: unknown, idx: number) => idx !== index) }))}>删除步骤</Button>
            </View>
          ))}
          <Button className='secondary-btn inline-btn full-btn' onClick={() => setForm((prev) => ({ ...prev, flow_steps: [...prev.flow_steps, { step_order: prev.flow_steps.length + 1, image_url: '', caption: '' }] }))}>新增工序步骤</Button>
          <View className='editor-actions'>
            <Button className='ghost-btn inline-btn' onClick={() => setShowForm(false)}>取消</Button>
            <Button className='primary-btn inline-btn' onClick={save}>保存商品</Button>
          </View>
        </View>
      ) : null}
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && filteredRows.length === 0 ? <EmptyHint text='暂无商品' /> : null}
        {filteredRows.map((row) => (
          <View className='data-card' key={row.id}>
            {row.cover_url ? <Image className='data-card-cover' src={getAssetUrl(String(row.cover_url))} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{String(row.name || `#${row.id}`)}</Text>
            <Text className='data-card-line'>类型：{formatValue(row.product_type)}</Text>
            <Text className='data-card-line'>分类：{formatValue(row.list_category)}</Text>
            <Text className='data-card-line'>状态：{formatValue(row.status)}</Text>
            <Text className='data-card-line'>排序：{formatValue(row.sort_order)}</Text>
            <View className='editor-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => openEdit(row)}>编辑</Button>
              <Button className='danger-btn inline-btn' onClick={() => remove(row)}>删除</Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function ColorCardSection({ refreshTick }: { refreshTick: number }) {
  const [dimensions, setDimensions] = useState<ColorCardDimension[]>([])
  const [presets, setPresets] = useState<ColorCardPreset[]>([])
  const [optionEditingId, setOptionEditingId] = useState<number | null>(null)
  const [presetEditingId, setPresetEditingId] = useState<number | null>(null)
  const [optionForm, setOptionForm] = useState<Record<string, any>>({ dimension_id: '', name: '', sort_order: 0 })
  const [presetForm, setPresetForm] = useState<Record<string, any>>({
    fabric_option_id: '',
    pattern_option_id: '',
    mordant_option_id: '',
    time_option_id: '',
    image_url: '',
  })

  const load = async () => {
    try {
      const [optionRes, presetRes] = await Promise.all([fetchColorCardOptions(), fetchColorCardPresets()])
      setDimensions(optionRes.dimensions || [])
      setPresets(presetRes.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const flatOptions = useMemo(
    () =>
      dimensions.flatMap((dimension) =>
        (dimension.options || []).map((option) => ({
          ...option,
          dimension_id: dimension.id,
          dimension_name: dimension.name,
        }))
      ),
    [dimensions]
  )

  const saveOption = async () => {
    try {
      const payload = {
        dimension_id: Number(optionForm.dimension_id),
        name: optionForm.name,
        sort_order: Number(optionForm.sort_order || 0),
      }
      if (optionEditingId) await updateAdminItem(`/color-card/options/${optionEditingId}`, payload)
      else await createAdminItem('/color-card/options', payload)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setOptionEditingId(null)
      setOptionForm({ dimension_id: '', name: '', sort_order: 0 })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const savePreset = async () => {
    try {
      const payload = {
        fabric_option_id: Number(presetForm.fabric_option_id),
        pattern_option_id: Number(presetForm.pattern_option_id),
        mordant_option_id: Number(presetForm.mordant_option_id),
        time_option_id: Number(presetForm.time_option_id),
        image_url: presetForm.image_url,
      }
      if (presetEditingId) await updateAdminItem(`/color-card/presets/${presetEditingId}`, payload)
      else await createAdminItem('/color-card/presets', payload)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setPresetEditingId(null)
      setPresetForm({ fabric_option_id: '', pattern_option_id: '', mordant_option_id: '', time_option_id: '', image_url: '' })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const deleteOptionItem = async (id: number) => {
    const ok = await confirmAction('删除色卡选项', '确定删除该色卡选项吗？')
    if (!ok) return
    try {
      await deleteAdminItem(`/color-card/options/${id}`)
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const deletePresetItem = async (id: number) => {
    const ok = await confirmAction('删除预设', '确定删除该预设效果图吗？')
    if (!ok) return
    try {
      await deleteAdminItem(`/color-card/presets/${id}`)
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='色卡工具管理' description='管理色卡选项维度和四维组合预设效果图。' />
      <View className='editor-card'>
        <Text className='editor-title'>{optionEditingId ? '编辑色卡选项' : '新增色卡选项'}</Text>
        <FieldEditor
          field={{
            key: 'dimension_id',
            label: '所属维度',
            type: 'select',
            options: dimensions.map((item) => ({ label: item.name, value: String(item.id) })),
          }}
          value={optionForm.dimension_id}
          onChange={(value) => setOptionForm((prev) => ({ ...prev, dimension_id: value }))}
        />
        <FieldEditor field={{ key: 'name', label: '选项名称', type: 'text' }} value={optionForm.name} onChange={(value) => setOptionForm((prev) => ({ ...prev, name: value }))} />
        <FieldEditor field={{ key: 'sort_order', label: '排序', type: 'number' }} value={optionForm.sort_order} onChange={(value) => setOptionForm((prev) => ({ ...prev, sort_order: value }))} />
        <View className='editor-actions'>
          <Button className='ghost-btn inline-btn' onClick={() => { setOptionEditingId(null); setOptionForm({ dimension_id: '', name: '', sort_order: 0 }) }}>重置</Button>
          <Button className='primary-btn inline-btn' onClick={saveOption}>保存选项</Button>
        </View>
      </View>
      <View className='editor-card'>
        <Text className='editor-title'>{presetEditingId ? '编辑预设效果图' : '新增预设效果图'}</Text>
        {(['fabric_option_id', 'pattern_option_id', 'mordant_option_id', 'time_option_id'] as const).map((key) => (
          <FieldEditor
            key={key}
            field={{
              key,
              label: key,
              type: 'select',
              options: flatOptions.map((item) => ({ label: `${item.dimension_name} / ${item.name}`, value: String(item.id) })),
            }}
            value={presetForm[key]}
            onChange={(value) => setPresetForm((prev) => ({ ...prev, [key]: value }))}
          />
        ))}
        <FieldEditor field={{ key: 'image_url', label: '效果图', type: 'image' }} value={presetForm.image_url} onChange={(value) => setPresetForm((prev) => ({ ...prev, image_url: value }))} />
        <View className='editor-actions'>
          <Button className='ghost-btn inline-btn' onClick={() => { setPresetEditingId(null); setPresetForm({ fabric_option_id: '', pattern_option_id: '', mordant_option_id: '', time_option_id: '', image_url: '' }) }}>重置</Button>
          <Button className='primary-btn inline-btn' onClick={savePreset}>保存预设</Button>
        </View>
      </View>
      <Text className='subsection-title'>全部色卡选项</Text>
      <View className='card-list'>
        {flatOptions.map((item) => (
          <View className='data-card' key={`opt-${item.id}`}>
            <Text className='data-card-title'>{item.name}</Text>
            <Text className='data-card-line'>维度：{item.dimension_name}</Text>
            <Text className='data-card-line'>排序：{item.sort_order}</Text>
            <View className='editor-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => {
                setOptionEditingId(item.id)
                setOptionForm({ dimension_id: String(item.dimension_id), name: item.name, sort_order: item.sort_order })
              }}>编辑</Button>
              <Button className='danger-btn inline-btn' onClick={() => deleteOptionItem(item.id)}>删除</Button>
            </View>
          </View>
        ))}
      </View>
      <Text className='subsection-title'>全部预设效果图</Text>
      <View className='card-list'>
        {presets.map((item) => (
          <View className='data-card' key={`preset-${item.id}`}>
            {item.image_url ? <Image className='data-card-cover' src={getAssetUrl(item.image_url)} mode='aspectFill' /> : null}
            <Text className='data-card-title'>预设 #{item.id}</Text>
            <Text className='data-card-line'>布料：{item.fabric_option_id}</Text>
            <Text className='data-card-line'>纹样：{item.pattern_option_id}</Text>
            <Text className='data-card-line'>媒染剂：{item.mordant_option_id}</Text>
            <Text className='data-card-line'>时长：{item.time_option_id}</Text>
            <View className='editor-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => {
                setPresetEditingId(item.id)
                setPresetForm({
                  fabric_option_id: String(item.fabric_option_id),
                  pattern_option_id: String(item.pattern_option_id),
                  mordant_option_id: String(item.mordant_option_id),
                  time_option_id: String(item.time_option_id),
                  image_url: item.image_url,
                })
              }}>编辑</Button>
              <Button className='danger-btn inline-btn' onClick={() => deletePresetItem(item.id)}>删除</Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function MediaLibrarySection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<AdminUploadItem[]>([])
  const [type, setType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const typeOptions = [
    { label: '全部类型', value: '' },
    { label: '图片', value: 'image' },
    { label: '视频', value: 'video' },
    { label: '其他', value: 'other' },
  ]

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchUploads({ type, keyword, limit: 200 })
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick, type])

  const uploadMedia = async (kind: 'image' | 'video') => {
    try {
      let filePath = ''
      if (kind === 'image') {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] })
        filePath = res.tempFilePaths?.[0] || ''
      } else {
        const res = await Taro.chooseVideo({ sourceType: ['album', 'camera'], compressed: true, maxDuration: 60 })
        filePath = res.tempFilePath || ''
      }
      if (!filePath) return
      Taro.showLoading({ title: '上传中...' })
      await uploadAdminLocalFile(filePath)
      Taro.hideLoading()
      Taro.showToast({ title: '上传成功', icon: 'success' })
      await load()
    } catch (err: unknown) {
      Taro.hideLoading()
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='媒体库' description='查看已上传的图片与视频，支持筛选与继续复用。' />
      <View className='action-row wrap-row'>
        <Picker mode='selector' range={typeOptions.map((item) => item.label)} value={typeOptions.findIndex((item) => item.value === type)} onChange={(e) => setType(typeOptions[Number(e.detail.value)]?.value || '')}>
          <View className='picker-field'>文件类型：{typeOptions.find((item) => item.value === type)?.label || '全部类型'}</View>
        </Picker>
        <Input className='search-input' value={keyword} placeholder='按文件名搜索' onInput={(e) => setKeyword(e.detail.value)} />
        <Button className='secondary-btn inline-btn' onClick={load}>搜索</Button>
        <Button className='primary-btn inline-btn' onClick={() => uploadMedia('image')}>上传图片</Button>
        <Button className='primary-btn inline-btn' onClick={() => uploadMedia('video')}>上传视频</Button>
      </View>
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && rows.length === 0 ? <EmptyHint text='暂无文件' /> : null}
        {rows.map((item) => (
          <View className='data-card' key={item.url}>
            {item.file_type === 'image' ? <Image className='data-card-cover' src={getAssetUrl(item.url)} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{item.filename}</Text>
            <Text className='data-card-line'>类型：{item.file_type}</Text>
            <Text className='data-card-line'>地址：{item.url}</Text>
            <Text className='data-card-line'>时间：{item.updated_at}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function UserTasksSection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<AdminUserTask[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchUserTasks()
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const patchStatus = async (row: AdminUserTask, status: string) => {
    try {
      await updateUserTask(row.id, status)
      Taro.showToast({ title: '状态已更新', icon: 'success' })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='用户任务审核' description='查看用户提交作品，并对任务状态进行审核确认。' />
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && rows.length === 0 ? <EmptyHint text='暂无任务提交' /> : null}
        {rows.map((row) => (
          <View className='data-card' key={row.id}>
            {row.submit_image_url ? <Image className='data-card-cover' src={getAssetUrl(row.submit_image_url)} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{row.task?.name || `任务 #${row.id}`}</Text>
            <Text className='data-card-line'>用户：{row.user?.username || '-'}</Text>
            <Text className='data-card-line'>分类：{row.task?.category || '-'}</Text>
            <Text className='data-card-line'>状态：{row.status}</Text>
            <Text className='data-card-line'>说明：{row.submit_description || '-'}</Text>
            <View className='editor-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => patchStatus(row, 'submitted')}>标记已提交</Button>
              <Button className='primary-btn inline-btn' onClick={() => patchStatus(row, 'completed')}>标记完成</Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function UserDiySection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<AdminUserDiyRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchUserDiyRecords()
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  return (
    <View className='section-card'>
      <SectionHeader title='用户 DIY 记录' description='查看用户保存的色卡和 DIY 记录预览。' />
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && rows.length === 0 ? <EmptyHint text='暂无 DIY 记录' /> : null}
        {rows.map((row) => (
          <View className='data-card' key={row.id}>
            {row.preview_image_url ? <Image className='data-card-cover' src={getAssetUrl(row.preview_image_url)} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{row.title || `记录 #${row.id}`}</Text>
            <View className='data-card-line row'>
              用户：{row.user?.avatar_url && <Image className='mini-avatar-inline' src={row.user.avatar_url} mode='aspectFill' />}
              <Text>{row.user?.username || '-'}</Text>
            </View>
            <Text className='data-card-line'>来源类型：{row.source_type === 'color_card' ? '色卡工具' : '体验项目'}</Text>
            {row.payload?.summary && (
              <View className='data-card-line payload-box'>
                <Text className='payload-label'>具体选项：</Text>
                <Text className='payload-content'>{row.payload.summary}</Text>
              </View>
            )}
            <Text className='data-card-line'>创建时间：{row.created_at || '-'}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function UserManagementSection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchUserList()
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const onUpdateRole = async (user: AdminUserItem, role: string) => {
    const roleMap: Record<string, string> = { tourist: '游客', worker: '工作者', admin: '管理员' }
    
    if (role === 'admin') {
      const ok = await confirmAction('授权管理员', `确定将用户「${user.username}」设为管理员吗？` + "`n" + '授权后需要立即为其设置登录密码。')
      if (!ok) return
      onSetPassword(user, 'admin')
      return
    }

    const ok = await confirmAction('权限修改', `确定将用户「${user.username}」设为${roleMap[role]}吗？`)
    if (!ok) return

    try {
      await updateUserRole(user.id, role)
      Taro.showToast({ title: '修改成功', icon: 'success' })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const onSetPassword = async (user: AdminUserItem, newRole?: string) => {
    Taro.showModal({
      title: newRole === 'admin' ? '设为管理员并设置密码' : '设置登录密码',
      content: '',
      editable: true,
      placeholderText: '请输入该管理员的登录密码',
      success: async (res: any) => {
        if (res.confirm && res.content) {
          try {
            await updateUserRole(user.id, newRole, res.content)
            Taro.showToast({ title: '设置成功', icon: 'success' })
            await load()
          } catch (err: unknown) {
            handleAdminError(err)
          }
        } else if (res.confirm) {
          Taro.showToast({ title: '密码不能为空', icon: 'none' })
        }
      }
    } as any)
  }

  const onDeleteUser = async (user: AdminUserItem) => {
    const ok = await confirmAction('删除用户', `确定要彻底删除用户「${user.username}」吗？此操作不可恢复，且会同步删除该用户的所有 DIY 记录、任务记录和收藏数据。`)
    if (!ok) return

    try {
      await deleteUser(user.id)
      Taro.showToast({ title: '删除成功', icon: 'success' })
      await load()
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='用户管理' description='查看所有注册用户，并修改其权限等级。设为管理员后，请务必设置登录密码以供其登录此后台。' />
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && rows.length === 0 ? <EmptyHint text='暂无用户数据' /> : null}
        {rows.map((row) => (
          <View className='data-card' key={row.id}>
            {row.avatar_url ? <Image className='mini-avatar' src={row.avatar_url} mode='aspectFill' /> : null}
            <Text className='data-card-title'>{row.username}</Text>
            <Text className='data-card-line'>邮箱：{row.email || '-'}</Text>
            <View className='data-card-line row'>
              权限：<Text className={`role-badge ${row.role}`}>
                {row.role === 'admin' ? '管理员' : row.role === 'worker' ? '工作者' : '游客'}
              </Text>
              {row.role === 'admin' && (
                <Text className={`role-badge ${row.has_password ? 'success' : 'warn'}`} style={{ marginLeft: '8px' }}>
                  {row.has_password ? '已设密码' : '未设密码'}
                </Text>
              )}
            </View>
            <Text className='data-card-line'>注册：{row.created_at || '-'}</Text>
            <View className='editor-actions wrap-row user-actions'>
              <Button className='secondary-btn inline-btn' onClick={() => onUpdateRole(row, 'tourist')}>设为游客</Button>
              <Button className='secondary-btn inline-btn' onClick={() => onUpdateRole(row, 'worker')}>设为工作者</Button>
              <Button className='primary-btn inline-btn' onClick={() => onUpdateRole(row, 'admin')}>设为管理员</Button>
              {row.role === 'admin' && (
                <Button className='primary-btn inline-btn' onClick={() => onSetPassword(row)}>设置密码</Button>
              )}
              <Button className='danger-btn inline-btn' onClick={() => onDeleteUser(row)}>删除账号</Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function SiteConfigSection({ refreshTick }: { refreshTick: number }) {
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>([])

  const load = async () => {
    try {
      const res = await fetchSiteConfig()
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick])

  const save = async () => {
    try {
      await saveSiteConfig(rows.filter((item) => item.key.trim()))
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err: unknown) {
      handleAdminError(err)
    }
  }

  const onUpload = async (index: number) => {
    try {
      const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] })
      const filePath = res.tempFilePaths?.[0]
      if (!filePath) return
      Taro.showLoading({ title: '上传中...' })
      const uploaded = await uploadAdminLocalFile(filePath)
      Taro.hideLoading()
      const next = [...rows]
      next[index] = { ...next[index], value: uploaded.url || '' }
      setRows(next)
      Taro.showToast({ title: '上传成功', icon: 'success' })
    } catch (err: unknown) {
      Taro.hideLoading()
      handleAdminError(err)
    }
  }

  return (
    <View className='section-card'>
      <SectionHeader title='站点配置' description='管理默认二维码等基础配置项。' />
      {rows.map((row, index) => (
        <View className='config-card' key={`${row.key}-${index}`}>
          <Input
            className='field-input compact'
            value={row.key}
            placeholder='配置键'
            onInput={(e) => {
              const next = [...rows]
              next[index] = { ...next[index], key: e.detail.value }
              setRows(next)
            }}
          />
          <Textarea
            className='small-textarea'
            value={row.value}
            autoHeight
            placeholder='配置值'
            onInput={(e) => {
              const next = [...rows]
              next[index] = { ...next[index], value: e.detail.value }
              setRows(next)
            }}
          />
          {row.value && (row.value.startsWith('http') || row.value.includes('/uploads/')) && (
            <Image className='field-preview-image' src={getAssetUrl(row.value)} mode='aspectFit' />
          )}
          <View className='editor-actions'>
            <Button className='secondary-btn inline-btn' onClick={() => onUpload(index)}>上传图片</Button>
            <Button className='danger-btn inline-btn' onClick={() => setRows(rows.filter((_, idx) => idx !== index))}>删除</Button>
          </View>
        </View>
      ))}
      <View className='editor-actions'>
        <Button className='secondary-btn inline-btn' onClick={() => setRows([...rows, { key: '', value: '' }])}>新增配置项</Button>
        <Button className='primary-btn inline-btn' onClick={save}>保存配置</Button>
      </View>
    </View>
  )
}

function AnalyticsSection({ refreshTick }: { refreshTick: number }) {
  const [eventType, setEventType] = useState('')
  const [rows, setRows] = useState<AnalyticsEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const options = [
    { label: '全部事件', value: '' },
    { label: '页面浏览', value: 'page_view' },
    { label: '我想要点击', value: 'want_click' },
    { label: '色卡使用', value: 'color_card_use' },
  ]

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchAnalyticsEvents(eventType || undefined, 200)
      setRows(res.items || [])
    } catch (err: unknown) {
      handleAdminError(err)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    load()
  }, [refreshTick, eventType])

  return (
    <View className='section-card'>
      <SectionHeader title='埋点分析' description='查看前端浏览量、点击量和原始埋点记录。' />
      <View className='action-row wrap-row'>
        <Picker mode='selector' range={options.map((item) => item.label)} value={options.findIndex((item) => item.value === eventType)} onChange={(e) => setEventType(options[Number(e.detail.value)]?.value || '')}>
          <View className='picker-field'>事件筛选：{options.find((item) => item.value === eventType)?.label || '全部事件'}</View>
        </Picker>
        <Button className='secondary-btn inline-btn' onClick={load}>重新加载</Button>
      </View>
      <View className='card-list'>
        {loading ? <EmptyHint text='加载中...' /> : null}
        {!loading && rows.length === 0 ? <EmptyHint text='暂无埋点数据' /> : null}
        {rows.map((item) => (
          <View className='data-card' key={item.id}>
            <Text className='data-card-title'>{item.event_type}</Text>
            <Text className='data-card-line'>页面：{item.page_path || '-'}</Text>
            <Text className='data-card-line'>目标：{item.target_type || '-'} / {item.target_id || '-'}</Text>
            <Text className='data-card-line'>用户：{item.user_id || '-'}</Text>
            <Text className='data-card-line'>时间：{item.created_at || '-'}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <View className='section-header'>
      <Text className='section-title'>{title}</Text>
      <Text className='section-desc'>{description}</Text>
    </View>
  )
}

function FieldEditor({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (value: any) => void }) {
  const selectedIndex = Math.max(0, (field.options || []).findIndex((item) => item.value === String(value ?? '')))
  const selectedLabel = (field.options || []).find((item) => item.value === String(value ?? ''))?.label || '请选择'

  const uploadFile = async () => {
    try {
      let filePath = ''
      if (field.type === 'video') {
        const res = await Taro.chooseVideo({ sourceType: ['album', 'camera'], compressed: true, maxDuration: 60 })
        filePath = res.tempFilePath || ''
      } else {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] })
        filePath = res.tempFilePaths?.[0] || ''
      }
      if (!filePath) return
      Taro.showLoading({ title: '上传中...' })
      const uploaded = await uploadAdminLocalFile(filePath)
      Taro.hideLoading()
      onChange(uploaded.url || '')
      Taro.showToast({ title: '上传成功', icon: 'success' })
    } catch (err: unknown) {
      Taro.hideLoading()
      handleAdminError(err)
    }
  }

  return (
    <View className='field-block'>
      <Text className='field-label'>{field.label}</Text>
      {field.type === 'textarea' ? (
        <Textarea className='field-textarea' value={String(value || '')} autoHeight placeholder={field.placeholder || ''} onInput={(e) => onChange(e.detail.value)} />
      ) : field.type === 'number' ? (
        <Input className='field-input' type='number' value={String(value ?? '')} placeholder={field.placeholder || ''} onInput={(e) => onChange(e.detail.value)} />
      ) : field.type === 'checkbox' ? (
        <View className='switch-row'>
          <Text className='switch-label'>{Boolean(value) ? '已启用' : '未启用'}</Text>
          <Switch checked={Boolean(value)} color='#b8763e' onChange={(e) => onChange(e.detail.value)} />
        </View>
      ) : field.type === 'select' ? (
        <Picker mode='selector' range={(field.options || []).map((item) => item.label)} value={selectedIndex} onChange={(e) => onChange(field.options?.[Number(e.detail.value)]?.value || '')}>
          <View className='picker-field'>{selectedLabel}</View>
        </Picker>
      ) : (
        <Input className='field-input' value={String(value || '')} placeholder={field.placeholder || ''} onInput={(e) => onChange(e.detail.value)} />
      )}
      {field.type === 'image' || field.type === 'video' ? (
        <View className='upload-block'>
          <Button className='secondary-btn inline-btn' onClick={uploadFile}>上传{field.type === 'image' ? '图片' : '视频'}</Button>
          {value ? <Text className='field-help'>{String(value)}</Text> : null}
          {field.type === 'image' && value ? <Image className='field-preview-image' src={getAssetUrl(String(value))} mode='aspectFill' /> : null}
        </View>
      ) : null}
      {field.help ? <Text className='field-help'>{field.help}</Text> : null}
    </View>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <View className='empty-card'>
      <Text className='empty-text'>{text}</Text>
    </View>
  )
}

function replaceId(path: string, id: string | number) {
  return path.replace(':id', String(id))
}

function initialForm(fields: FieldConfig[], source: Record<string, unknown>) {
  const result: Record<string, any> = {}
  fields.forEach((field) => {
    result[field.key] = defaultFieldValue(field, source[field.key])
  })
  return result
}

function defaultFieldValue(field: FieldConfig, value: unknown) {
  if (field.type === 'checkbox') return Boolean(value)
  if (field.type === 'number') return value ?? 0
  if (field.type === 'select') return value ?? field.options?.[0]?.value ?? ''
  return value ?? ''
}

function serializeForm(fields: FieldConfig[], form: Record<string, any>) {
  const result: Record<string, any> = {}
  fields.forEach((field) => {
    const value = form[field.key]
    if (field.type === 'number') result[field.key] = Number(value || 0)
    else if (field.type === 'checkbox') result[field.key] = Boolean(value)
    else result[field.key] = value
  })
  return result
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return `${value.length}项`
  if (typeof value === 'object') return snippet(JSON.stringify(value))
  return snippet(String(value))
}

function snippet(text: string, max = 44) {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function findCoverUrl(row: Record<string, unknown>) {
  const keys = ['cover_url', 'image_url', 'reference_image_url', 'preview_image_url']
  const found = keys.find((key) => typeof row[key] === 'string' && row[key])
  return found ? String(row[found]) : ''
}

async function confirmAction(title: string, content: string) {
  const res = await Taro.showModal({ title, content })
  return res.confirm
}

function handleAdminError(err: unknown) {
  const msg = err instanceof Error ? err.message : '操作失败'
  if (msg.includes('401') || msg.includes('403') || msg.includes('invalid_token') || msg.includes('登录状态失效')) {
    clearAdminToken()
    clearAdminProfile()
    Taro.showToast({ title: '登录状态失效', icon: 'none' })
    setTimeout(() => Taro.reLaunch({ url: '/pages/admin/login' }), 500)
    return
  }
  Taro.showToast({ title: msg, icon: 'none' })
}

function emptyProduct() {
  return {
    name: '',
    summary: '',
    cover_url: '',
    product_type: '礼盒',
    list_category: 'brand',
    primary_category: '',
    producer: '',
    origin: '',
    process_text: '',
    detail_html: '',
    qr_code_url: '',
    sort_order: 0,
    status: 'published',
    flow_steps: [],
    gallery: [],
  }
}

