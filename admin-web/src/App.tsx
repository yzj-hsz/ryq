import { useEffect, useMemo, useState } from 'react'
import {
  API_BASE,
  adminRequest,
  adminUpload,
  clearAdminToken,
  fetchHomeIntroText,
  getAdminToken,
  loginAdmin,
  saveHomeIntroText,
  setAdminToken,
  publicRequest,
} from './api'

type MenuKey =
  | 'dashboard'
  | 'analytics'
  | 'preview'
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
    title: '总览',
    items: [
      { key: 'dashboard', label: '工作台' },
      { key: 'analytics', label: '数据分析' },
      { key: 'users', label: '用户管理' },
      { key: 'preview', label: '前端预览中心' },
    ],
  },
  {
    title: '首页管理',
    items: [
      { key: 'home-videos', label: '首页视频' },
      { key: 'home-ppts', label: '首页 PPT' },
      { key: 'home-intro-text', label: '首页图文' },
      { key: 'home-banners', label: '精选推荐' },
      { key: 'home-highlights', label: '项目亮点' },
    ],
  },
  {
    title: '内容管理',
    items: [
      { key: 'products', label: '商品管理' },
      { key: 'culture-promo', label: '认识饶平宣传区' },
      { key: 'culture-articles', label: '文化图文' },
      { key: 'experiences', label: '体验项目' },
      { key: 'task-showcases', label: '茶染任务' },
      { key: 'color-card', label: '色卡工具' },
      { key: 'media', label: '媒体库' },
    ],
  },
  {
    title: '审核与配置',
    items: [
      { key: 'user-tasks', label: '用户任务审核' },
      { key: 'user-diy', label: '用户 DIY 记录' },
      { key: 'site-config', label: '站点配置' },
    ],
  },
]

const genericConfigs: CrudConfig[] = [
  {
    key: 'home-videos',
    title: '首页视频管理',
    description: '管理首页视频轮播，支持视频文件与封面上传、启用状态和排序。',
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
      { key: 'video_url', label: '视频文件', type: 'video', help: '支持本地上传视频并自动回填 URL' },
      { key: 'cover_url', label: '封面图片', type: 'image' },
      { key: 'sort_order', label: '排序值', type: 'number' },
      { key: 'is_active', label: '是否启用', type: 'checkbox' },
    ],
  },
  {
    key: 'home-ppts',
    title: '首页 PPT 管理',
    description: '管理首页 PPT 图片轮播，支持本地上传、预览、排序和启用。',
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
      { key: 'detail_html', label: '详情文案', type: 'textarea', help: '后台只需输入纯文本，前端会自动套用模板。' },
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
    description: '管理首页项目亮点卡片和详情内容。',
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
      { key: 'icon', label: '图标', type: 'text', placeholder: '例如 ✨' },
      { key: 'title', label: '标题', type: 'text' },
      { key: 'summary', label: '摘要', type: 'textarea' },
      { key: 'image_url', label: '亮点图片', type: 'image' },
      { key: 'detail_html', label: '详情文案', type: 'textarea', help: '支持分段输入，前端自动排版。' },
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
      { key: 'body_html', label: '正文文案', type: 'textarea', help: '纯文本录入即可，按空行自动分段展示。' },
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
      { key: 'notice_html', label: '注意事项文案', type: 'textarea', help: '可按每行一条或分段输入。' },
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

function App() {
  const [tokenReady, setTokenReady] = useState(Boolean(getAdminToken()))
  const [adminName, setAdminName] = useState(localStorage.getItem('ryq_admin_name') || '')
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')

  const onLoginSuccess = (token: string, name: string) => {
    setAdminToken(token)
    localStorage.setItem('ryq_admin_name', name)
    setAdminName(name)
    setTokenReady(true)
  }

  const onLogout = () => {
    clearAdminToken()
    localStorage.removeItem('ryq_admin_name')
    setTokenReady(false)
    setAdminName('')
  }

  if (!tokenReady) {
    return <LoginPage onSuccess={onLoginSuccess} />
  }

  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <div className='brand-card'>
          <div className='brand-title'>饶有趣管理端</div>
          <div className='brand-sub'>内容管理 + 数据分析 + v1.1</div>
        </div>
        {menuGroups.map((group) => (
          <div key={group.title} className='menu-group'>
            <div className='menu-group-title'>{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                className={`menu-btn ${activeMenu === item.key ? 'active' : ''}`}
                onClick={() => setActiveMenu(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <main className='main-panel'>
        <header className='topbar'>
          <div>
            <div className='page-title'>{getMenuLabel(activeMenu)}</div>
            <div className='page-subtitle'>接口基址：{API_BASE}</div>
          </div>
          <div className='topbar-actions'>
            <span className='admin-badge'>{adminName || '管理员'}</span>
            <button className='ghost-btn' onClick={onLogout}>退出登录</button>
          </div>
        </header>
        <section className='content-panel'>
          <SectionRenderer activeMenu={activeMenu} onJump={setActiveMenu} />
        </section>
      </main>
    </div>
  )
}

function getMenuLabel(key: MenuKey) {
  for (const group of menuGroups) {
    const found = group.items.find((item) => item.key === key)
    if (found) return found.label
  }
  return key
}

function SectionRenderer({ activeMenu, onJump }: { activeMenu: MenuKey; onJump: (key: MenuKey) => void }) {
  const genericConfig = genericConfigs.find((item) => item.key === activeMenu)
  if (genericConfig) return <GenericCrudSection config={genericConfig} />
  if (activeMenu === 'dashboard') return <DashboardSection onJump={onJump} />
  if (activeMenu === 'analytics') return <AnalyticsSection />
  if (activeMenu === 'preview') return <PreviewCenterSection onJump={onJump} />
  if (activeMenu === 'home-intro-text') return <SingletonTextSection />
  if (activeMenu === 'products') return <ProductSection />
  if (activeMenu === 'culture-promo') return <CulturePromoSection />
  if (activeMenu === 'color-card') return <ColorCardSection />
  if (activeMenu === 'media') return <MediaLibrarySection />
  if (activeMenu === 'user-tasks') return <UserTasksSection />
  if (activeMenu === 'user-diy') return <UserDiySection />
  if (activeMenu === 'users') return <UserManagementSection />
  if (activeMenu === 'site-config') return <SiteConfigSection />
  return <div>未实现的页面</div>
}

function LoginPage({ onSuccess }: { onSuccess: (token: string, name: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await loginAdmin(username.trim(), password)
      onSuccess(response.token, response.admin.display_name || response.admin.username)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-page'>
      <div className='login-card'>
        <div className='login-title'>饶有趣管理端登录</div>
        <div className='login-subtitle'>使用后台管理员账号登录，统一管理首页内容、商品、任务、色卡和数据分析。</div>
        <label className='field-block'>
          <span>用户名</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder='请输入管理员用户名' />
        </label>
        <label className='field-block'>
          <span>密码</span>
          <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='请输入密码' />
        </label>
        {error ? <div className='error-box'>{error}</div> : null}
        <button className='primary-btn large' disabled={loading || !username || !password} onClick={submit}>
          {loading ? '登录中...' : '登录管理端'}
        </button>
        <div className='tips-box'>
          <div>提示：</div>
          <div>1. 管理接口基址：`/api/v1/admin/*`</div>
          <div>2. 登录接口：`/api/v1/admin/auth/login`</div>
        </div>
      </div>
    </div>
  )
}

function DashboardSection({ onJump }: { onJump: (key: MenuKey) => void }) {
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminRequest<{ summary: Record<string, number> }>('/dashboard/summary')
      .then((res) => setSummary(res.summary || {}))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    ['总用户数', summary.total_users],
    ['今日新增用户', summary.new_users_today],
    ['今日 PV', summary.today_pv],
    ['今日 UV', summary.today_uv],
    ['商品我想要点击', summary.total_want_clicks],
    ['色卡工具使用量', summary.total_color_card_uses],
  ]

  return (
    <div className='stack'>
      <SectionIntro
        title='工作台'
        description='查看管理端概览、访问数据和快捷入口。'
        actions={
          <>
            <button className='ghost-btn' onClick={() => onJump('analytics')}>查看数据分析</button>
            <button className='ghost-btn' onClick={() => onJump('preview')}>打开前端预览中心</button>
          </>
        }
      />
      <div className='card-grid'>
        {cards.map(([label, value]) => (
          <div className='metric-card' key={label}>
            <div className='metric-label'>{label}</div>
            <div className='metric-value'>{loading ? '...' : value ?? 0}</div>
          </div>
        ))}
      </div>
      <div className='panel'>
        <div className='panel-title'>快捷操作</div>
        <div className='shortcut-row'>
          <button className='primary-btn' onClick={() => onJump('products')}>进入商品管理</button>
          <button className='ghost-btn' onClick={() => onJump('home-banners')}>管理精选推荐</button>
          <button className='ghost-btn' onClick={() => onJump('task-showcases')}>管理茶染任务</button>
          <button className='ghost-btn' onClick={() => onJump('media')}>打开媒体库</button>
        </div>
      </div>
    </div>
  )
}

function AnalyticsSection() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminRequest<{ summary: Record<string, number> }>('/dashboard/summary'),
      adminRequest<{ items: any[] }>(`/analytics/events?limit=500${filter ? `&event_type=${encodeURIComponent(filter)}` : ''}`),
    ])
      .then(([summaryRes, eventRes]) => {
        setSummary(summaryRes.summary || {})
        setEvents(eventRes.items || [])
      })
      .finally(() => setLoading(false))
  }, [filter])

  const pageViews = events.filter((item) => item.event_type === 'page_view')
  const clicks = events.filter((item) => item.event_type !== 'page_view')
  const topTargets = summarizeTop(events)
  const pageStats = summarizePages(pageViews)

  return (
    <div className='stack'>
      <SectionIntro title='数据分析' description='查看前端浏览量、点击量、热门内容和原始埋点记录。' />
      <div className='card-grid'>
        <Metric label='今日 PV' value={summary.today_pv} />
        <Metric label='今日 UV' value={summary.today_uv} />
        <Metric label='商品我想要点击' value={summary.total_want_clicks} />
        <Metric label='色卡工具使用' value={summary.total_color_card_uses} />
      </div>
      <div className='panel'>
        <div className='panel-header'>
          <div className='panel-title'>筛选与统计</div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value=''>全部事件</option>
            <option value='page_view'>页面浏览</option>
            <option value='want_click'>我想要点击</option>
            <option value='color_card_use'>色卡使用</option>
          </select>
        </div>
        <div className='mini-stats'>
          <div>原始事件数：{loading ? '...' : events.length}</div>
          <div>浏览事件数：{loading ? '...' : pageViews.length}</div>
          <div>点击事件数：{loading ? '...' : clicks.length}</div>
        </div>
      </div>
      <div className='two-col'>
        <div className='panel'>
          <div className='panel-title'>热门内容排行</div>
          <SimpleTable
            columns={[
              { key: 'target', label: '内容' },
              { key: 'count', label: '次数' },
            ]}
            rows={topTargets}
          />
        </div>
        <div className='panel'>
          <div className='panel-title'>页面浏览排行</div>
          <SimpleTable
            columns={[
              { key: 'page', label: '页面路径' },
              { key: 'count', label: '浏览量' },
            ]}
            rows={pageStats}
          />
        </div>
      </div>
      <div className='panel'>
        <div className='panel-title'>原始埋点记录</div>
        <SimpleTable
          columns={[
            { key: 'event_type', label: '事件类型' },
            { key: 'page_path', label: '页面路径' },
            { key: 'target_type', label: '目标类型' },
            { key: 'target_id', label: '目标 ID' },
            { key: 'created_at', label: '时间' },
          ]}
          rows={events}
        />
      </div>
    </div>
  )
}

function PreviewCenterSection({ onJump }: { onJump: (key: MenuKey) => void }) {
  const [data, setData] = useState<{
    home?: any
    products?: any[]
    handmade?: any[]
    articles?: any[]
    promo?: any
    experiences?: any[]
    tasks?: any[]
  }>({})

  useEffect(() => {
    Promise.all([
      publicRequest<any>('/home'),
      publicRequest<{ items: any[] }>('/products'),
      publicRequest<{ items: any[] }>('/products?list_category=handmade'),
      publicRequest<{ items: any[] }>('/culture/articles'),
      publicRequest<any>('/culture/promo'),
      publicRequest<{ items: any[] }>('/experiences?region=shenzhen'),
      publicRequest<{ items: any[] }>('/task-showcases'),
    ]).then(([home, products, handmade, articles, promo, experiences, tasks]) => {
      setData({
        home,
        products: products.items || [],
        handmade: handmade.items || [],
        articles: articles.items || [],
        promo,
        experiences: experiences.items || [],
        tasks: tasks.items || [],
      })
    })
  }, [])

  return (
    <div className='stack'>
      <SectionIntro title='前端预览中心' description='直接预览当前前端展示内容，并快速跳转到对应管理模块。' />
      <PreviewBlock
        title='首页内容'
        action={<button className='ghost-btn' onClick={() => onJump('home-banners')}>去管理首页</button>}
      >
        <div className='preview-strip'>
          {(data.home?.intro?.ppts || []).slice(0, 3).map((item: any) => (
            <img key={item.id} src={fullUrl(item.image_url)} className='preview-thumb' />
          ))}
        </div>
        <div className='preview-grid'>
          {(data.home?.banners || []).slice(0, 4).map((item: any) => (
            <PreviewCard key={item.id} title={item.title} image={item.image_url} />
          ))}
        </div>
      </PreviewBlock>
      <PreviewBlock
        title='饶平文创'
        action={<button className='ghost-btn' onClick={() => onJump('products')}>去管理商品</button>}
      >
        <div className='preview-grid'>
          {(data.products || []).slice(0, 4).map((item) => (
            <PreviewCard key={item.id} title={item.name} subtitle={item.summary} image={item.cover_url} />
          ))}
        </div>
      </PreviewBlock>
      <PreviewBlock
        title='匠心手作'
        action={<button className='ghost-btn' onClick={() => onJump('products')}>查看 handmade 商品</button>}
      >
        <div className='preview-grid'>
          {(data.handmade || []).slice(0, 4).map((item) => (
            <PreviewCard key={item.id} title={item.name} subtitle={item.summary} image={item.cover_url} />
          ))}
        </div>
      </PreviewBlock>
      <PreviewBlock
        title='认识饶平'
        action={<button className='ghost-btn' onClick={() => onJump('culture-articles')}>去管理文化图文</button>}
      >
        <div className='preview-hero'>
          <PreviewCard title={data.promo?.title} subtitle={data.promo?.subtitle} image={data.promo?.cover_url} />
        </div>
        <div className='preview-grid'>
          {(data.articles || []).slice(0, 4).map((item) => (
            <PreviewCard key={item.id} title={item.title} subtitle={item.summary} image={item.cover_url} />
          ))}
        </div>
      </PreviewBlock>
      <PreviewBlock
        title='玩转饶平'
        action={<button className='ghost-btn' onClick={() => onJump('experiences')}>去管理体验项目</button>}
      >
        <div className='preview-grid'>
          {(data.experiences || []).slice(0, 4).map((item) => (
            <PreviewCard key={item.id} title={item.name} subtitle={item.summary} image={item.cover_url} />
          ))}
        </div>
      </PreviewBlock>
      <PreviewBlock
        title='茶染任务'
        action={<button className='ghost-btn' onClick={() => onJump('task-showcases')}>去管理任务</button>}
      >
        <div className='preview-grid'>
          {(data.tasks || []).slice(0, 4).map((item) => (
            <PreviewCard key={item.id} title={item.name} subtitle={item.deadline_note} image={item.cover_url} />
          ))}
        </div>
      </PreviewBlock>
    </div>
  )
}

function SingletonTextSection() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomeIntroText()
      .then((res) => setText(res.text || ''))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!window.confirm('确认保存首页图文介绍吗？')) return
    await saveHomeIntroText(text)
    window.alert('保存成功')
  }

  return (
    <div className='stack'>
      <SectionIntro title='首页图文介绍' description='后台只需输入纯文本，前端会自动套用统一图文模板。' />
      <div className='two-col'>
        <div className='panel'>
          <div className='panel-title'>文案编辑</div>
          <textarea className='big-textarea' value={text} onChange={(e) => setText(e.target.value)} />
          <div className='form-actions'>
            <button className='primary-btn' onClick={save} disabled={loading}>保存首页图文</button>
          </div>
        </div>
        <div className='panel'>
          <div className='panel-title'>模板预览</div>
          <TextTemplatePreview text={text} />
        </div>
      </div>
    </div>
  )
}

function CulturePromoSection() {
  const [form, setForm] = useState<any>({ title: '', subtitle: '', cover_url: '', video_url: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminRequest<any>('/culture/promo')
      .then((res) => setForm({ ...res }))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!window.confirm('确认保存认识饶平宣传区吗？')) return
    await adminRequest('/culture/promo', 'PATCH', form)
    window.alert('保存成功')
  }

  return (
    <div className='stack'>
      <SectionIntro title='认识饶平宣传区' description='管理宣传视频封面区，支持本地上传封面图和视频地址。' />
      <div className='two-col'>
        <div className='panel'>
          <div className='panel-title'>编辑表单</div>
          <FieldEditor field={{ key: 'title', label: '标题', type: 'text' }} value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <FieldEditor field={{ key: 'subtitle', label: '副标题', type: 'textarea' }} value={form.subtitle} onChange={(value) => setForm({ ...form, subtitle: value })} />
          <FieldEditor field={{ key: 'cover_url', label: '封面图', type: 'image' }} value={form.cover_url} onChange={(value) => setForm({ ...form, cover_url: value })} />
          <FieldEditor field={{ key: 'video_url', label: '视频地址', type: 'video' }} value={form.video_url} onChange={(value) => setForm({ ...form, video_url: value })} />
          <div className='form-actions'>
            <button className='primary-btn' onClick={save} disabled={loading}>保存宣传区</button>
          </div>
        </div>
        <div className='panel'>
          <div className='panel-title'>前端预览</div>
          <PreviewCard title={form.title} subtitle={form.subtitle} image={form.cover_url} />
          <div className='muted-text'>视频地址：{form.video_url || '未配置'}</div>
        </div>
      </div>
    </div>
  )
}

function GenericCrudSection({ config }: { config: CrudConfig }) {
  const [rows, setRows] = useState<any[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})

  const loadRows = () => {
    setLoading(true)
    adminRequest<{ items: any[] }>(config.listPath)
      .then((res) => setRows(res.items || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRows()
  }, [config.key])

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return rows
    const text = keyword.trim().toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(text))
  }, [rows, keyword])

  const openCreate = () => {
    setEditing({ id: null })
    setForm(initialForm(config.fields, {}))
  }

  const openEdit = async (row: any) => {
    let detail = row
    if (config.detailPath) {
      detail = await adminRequest<any>(replaceId(config.detailPath, row.id))
    }
    setEditing(row)
    setForm(initialForm(config.fields, detail))
  }

  const save = async () => {
    const message = editing?.id ? '确认保存本次修改吗？' : '确认新增该内容吗？'
    if (!window.confirm(message)) return
    const payload = serializeForm(config.fields, form)
    if (editing?.id) {
      await adminRequest(replaceId(config.updatePath, editing.id), 'PATCH', payload)
    } else {
      await adminRequest(config.createPath, 'POST', payload)
    }
    setEditing(null)
    loadRows()
  }

  const remove = async (row: any) => {
    if (!window.confirm(`确认删除「${row.title || row.name || row.id}」吗？删除后前端将不再展示。`)) return
    await adminRequest(replaceId(config.deletePath, row.id), 'DELETE')
    loadRows()
  }

  return (
    <div className='stack'>
      <SectionIntro
        title={config.title}
        description={config.description}
        actions={<button className='primary-btn' onClick={openCreate}>新增内容</button>}
      />
      <div className='panel'>
        <div className='panel-header'>
          <div className='panel-title'>内容列表</div>
          <input className='search-input' value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder='按标题、名称、字段搜索' />
        </div>
        <SimpleTable
          columns={[...config.columns, { key: '__actions', label: '操作' }]}
          rows={filteredRows.map((row) => ({
            ...row,
            __actions: (
              <div className='row-actions'>
                <button className='link-btn' onClick={() => openEdit(row)}>修改</button>
                <button className='link-btn danger' onClick={() => remove(row)}>删除</button>
              </div>
            ),
          }))}
          loading={loading}
        />
      </div>
      {editing ? (
        <div className='modal-mask'>
          <div className='modal-card wide'>
            <div className='modal-header'>
              <div>{editing.id ? `编辑：${config.title}` : `新增：${config.title}`}</div>
              <button className='ghost-btn' onClick={() => setEditing(null)}>关闭</button>
            </div>
            <div className='two-col'>
              <div className='form-list'>
                {config.fields.map((field) => (
                  <FieldEditor
                    key={field.key}
                    field={field}
                    value={form[field.key]}
                    onChange={(value) => setForm({ ...form, [field.key]: value })}
                  />
                ))}
              </div>
              <div className='panel preview-panel'>
                <div className='panel-title'>内容预览</div>
                <GenericPreview form={form} />
              </div>
            </div>
            <div className='form-actions'>
              <button className='ghost-btn' onClick={() => setEditing(null)}>取消</button>
              <button className='primary-btn' onClick={save}>保存</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProductSection() {
  const [rows, setRows] = useState<any[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<any>(emptyProduct())

  const load = () => {
    setLoading(true)
    adminRequest<{ items: any[] }>('/products')
      .then((res) => setRows(res.items || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return rows
    const text = keyword.trim().toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(text))
  }, [rows, keyword])

  const openCreate = () => {
    setEditing({ id: null })
    setForm(emptyProduct())
  }

  const openEdit = async (row: any) => {
    const detail = await adminRequest<any>(`/products/${row.id}`)
    setEditing(row)
    setForm({
      ...emptyProduct(),
      ...detail,
      flow_steps: detail.flow_steps || [],
      gallery: detail.gallery || [],
    })
  }

  const save = async () => {
    const payload = {
      ...form,
      sort_order: Number(form.sort_order || 0),
      gallery: (form.gallery || []).map((item: any, index: number) => ({
        url: item.url,
        sort_order: Number(item.sort_order ?? index),
      })),
      flow_steps: (form.flow_steps || []).map((item: any, index: number) => ({
        step_order: Number(item.step_order ?? index + 1),
        image_url: item.image_url,
        caption: item.caption,
      })),
    }

    if (!window.confirm(editing?.id ? '确认保存对该商品的修改吗？' : '确认新增该商品吗？')) return
    if (editing?.id) {
      await adminRequest(`/products/${editing.id}`, 'PATCH', payload)
    } else {
      await adminRequest('/products', 'POST', payload)
    }
    setEditing(null)
    load()
  }

  const remove = async (row: any) => {
    if (!window.confirm(`确认删除该商品吗？删除后前端列表与详情页将不可访问。`)) return
    await adminRequest(`/products/${row.id}`, 'DELETE')
    load()
  }

  const updateGallery = (index: number, patch: Record<string, any>) => {
    const gallery = [...form.gallery]
    gallery[index] = { ...gallery[index], ...patch }
    setForm({ ...form, gallery })
  }

  const updateFlowStep = (index: number, patch: Record<string, any>) => {
    const flowSteps = [...form.flow_steps]
    flowSteps[index] = { ...flowSteps[index], ...patch }
    setForm({ ...form, flow_steps: flowSteps })
  }

  return (
    <div className='stack'>
      <SectionIntro
        title='商品管理'
        description='重点模块：支持商品基础信息、图集、工序图示、纯文本详情文案和二维码配置，并提供前端详情页预览。'
        actions={<button className='primary-btn' onClick={openCreate}>新增商品</button>}
      />
      <div className='panel'>
        <div className='panel-header'>
          <div className='panel-title'>商品列表</div>
          <input className='search-input' value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder='搜索商品名、类型、分类' />
        </div>
        <SimpleTable
          columns={[
            { key: 'name', label: '商品名称' },
            { key: 'product_type', label: '商品类型' },
            { key: 'list_category', label: '列表分类' },
            { key: 'status', label: '状态' },
            { key: 'sort_order', label: '排序' },
            { key: '__actions', label: '操作' },
          ]}
          rows={filteredRows.map((row) => ({
            ...row,
            __actions: (
              <div className='row-actions'>
                <button className='link-btn' onClick={() => openEdit(row)}>修改</button>
                <button className='link-btn danger' onClick={() => remove(row)}>删除</button>
              </div>
            ),
          }))}
          loading={loading}
        />
      </div>
      {editing ? (
        <div className='modal-mask'>
          <div className='modal-card xwide'>
            <div className='modal-header'>
              <div>{editing.id ? `编辑商品：${editing.name || ''}` : '新增商品'}</div>
              <button className='ghost-btn' onClick={() => setEditing(null)}>关闭</button>
            </div>
            <div className='product-layout'>
              <div className='product-form'>
                <FormGroup title='基础信息'>
                  <FieldEditor field={{ key: 'name', label: '商品名称', type: 'text' }} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                  <FieldEditor field={{ key: 'summary', label: '商品简介', type: 'textarea' }} value={form.summary} onChange={(value) => setForm({ ...form, summary: value })} />
                  <FieldEditor field={{ key: 'producer', label: '出品方', type: 'text' }} value={form.producer} onChange={(value) => setForm({ ...form, producer: value })} />
                  <FieldEditor field={{ key: 'origin', label: '产地', type: 'text' }} value={form.origin} onChange={(value) => setForm({ ...form, origin: value })} />
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
                    onChange={(value) => setForm({ ...form, product_type: value })}
                  />
                </FormGroup>
                <FormGroup title='列表展示设置'>
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
                    onChange={(value) => setForm({ ...form, list_category: value })}
                  />
                  <FieldEditor field={{ key: 'primary_category', label: '一级分类', type: 'text' }} value={form.primary_category} onChange={(value) => setForm({ ...form, primary_category: value })} />
                  <FieldEditor field={{ key: 'cover_url', label: '商品封面图', type: 'image' }} value={form.cover_url} onChange={(value) => setForm({ ...form, cover_url: value })} />
                  <FieldEditor field={{ key: 'sort_order', label: '排序值', type: 'number' }} value={form.sort_order} onChange={(value) => setForm({ ...form, sort_order: value })} />
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
                    onChange={(value) => setForm({ ...form, status: value })}
                  />
                </FormGroup>
                <FormGroup title='详情主体内容'>
                  <FieldEditor field={{ key: 'process_text', label: '制作流程文本', type: 'textarea', help: '建议格式：采茶 -> 晒青 -> 茶染 -> 晾晒' }} value={form.process_text} onChange={(value) => setForm({ ...form, process_text: value })} />
                  <FieldEditor field={{ key: 'detail_html', label: '详情文案', type: 'textarea', help: '输入纯文本即可，前端自动生成好看的图文区块。' }} value={form.detail_html} onChange={(value) => setForm({ ...form, detail_html: value })} />
                  <FieldEditor field={{ key: 'qr_code_url', label: '我想要二维码', type: 'image' }} value={form.qr_code_url} onChange={(value) => setForm({ ...form, qr_code_url: value })} />
                </FormGroup>
                <FormGroup title='图集管理'>
                  {(form.gallery || []).map((item: any, index: number) => (
                    <div className='array-card' key={`gallery-${index}`}>
                      <div className='array-card-header'>
                        <div>图集 #{index + 1}</div>
                        <button className='link-btn danger' onClick={() => setForm({ ...form, gallery: form.gallery.filter((_: any, idx: number) => idx !== index) })}>删除</button>
                      </div>
                      <FieldEditor field={{ key: 'url', label: '图片', type: 'image' }} value={item.url} onChange={(value) => updateGallery(index, { url: value })} />
                      <FieldEditor field={{ key: 'sort_order', label: '排序', type: 'number' }} value={item.sort_order} onChange={(value) => updateGallery(index, { sort_order: value })} />
                    </div>
                  ))}
                  <button className='ghost-btn' onClick={() => setForm({ ...form, gallery: [...form.gallery, { url: '', sort_order: form.gallery.length }] })}>新增图集图片</button>
                </FormGroup>
                <FormGroup title='工序图示管理'>
                  {(form.flow_steps || []).map((item: any, index: number) => (
                    <div className='array-card' key={`step-${index}`}>
                      <div className='array-card-header'>
                        <div>工序步骤 #{index + 1}</div>
                        <button className='link-btn danger' onClick={() => setForm({ ...form, flow_steps: form.flow_steps.filter((_: any, idx: number) => idx !== index) })}>删除</button>
                      </div>
                      <FieldEditor field={{ key: 'step_order', label: '步骤序号', type: 'number' }} value={item.step_order} onChange={(value) => updateFlowStep(index, { step_order: value })} />
                      <FieldEditor field={{ key: 'image_url', label: '工序图片', type: 'image' }} value={item.image_url} onChange={(value) => updateFlowStep(index, { image_url: value })} />
                      <FieldEditor field={{ key: 'caption', label: '说明文字', type: 'text' }} value={item.caption} onChange={(value) => updateFlowStep(index, { caption: value })} />
                    </div>
                  ))}
                  <button className='ghost-btn' onClick={() => setForm({ ...form, flow_steps: [...form.flow_steps, { step_order: form.flow_steps.length + 1, image_url: '', caption: '' }] })}>新增工序步骤</button>
                </FormGroup>
              </div>
              <div className='product-preview'>
                <div className='panel sticky'>
                  <div className='panel-title'>前端效果预览</div>
                  <ProductPreview product={form} />
                </div>
              </div>
            </div>
            <div className='form-actions'>
              <button className='ghost-btn' onClick={() => setEditing(null)}>取消</button>
              <button className='primary-btn' onClick={save}>保存商品</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ColorCardSection() {
  const [dimensions, setDimensions] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [optionForm, setOptionForm] = useState<any>({ dimension_id: '', name: '', sort_order: 0 })
  const [presetForm, setPresetForm] = useState<any>({
    fabric_option_id: '',
    pattern_option_id: '',
    mordant_option_id: '',
    time_option_id: '',
    image_url: '',
  })

  const load = () => {
    Promise.all([
      adminRequest<{ dimensions: any[] }>('/color-card/options'),
      adminRequest<{ items: any[] }>('/color-card/presets'),
    ]).then(([optionRes, presetRes]) => {
      setDimensions(optionRes.dimensions || [])
      setPresets(presetRes.items || [])
    })
  }

  useEffect(() => {
    load()
  }, [])

  const flatOptions = dimensions.flatMap((dimension) =>
    (dimension.options || []).map((option: any) => ({
      ...option,
      dimension_id: dimension.id,
      dimension_name: dimension.name,
    })),
  )

  const saveOption = async () => {
    if (!window.confirm('确认新增色卡选项吗？')) return
    await adminRequest('/color-card/options', 'POST', {
      dimension_id: Number(optionForm.dimension_id),
      name: optionForm.name,
      sort_order: Number(optionForm.sort_order || 0),
    })
    setOptionForm({ dimension_id: '', name: '', sort_order: 0 })
    load()
  }

  const deleteOption = async (id: number) => {
    if (!window.confirm('确认删除该色卡选项吗？')) return
    await adminRequest(`/color-card/options/${id}`, 'DELETE')
    load()
  }

  const savePreset = async () => {
    if (!window.confirm('确认新增色卡预设吗？')) return
    await adminRequest('/color-card/presets', 'POST', {
      fabric_option_id: Number(presetForm.fabric_option_id),
      pattern_option_id: Number(presetForm.pattern_option_id),
      mordant_option_id: Number(presetForm.mordant_option_id),
      time_option_id: Number(presetForm.time_option_id),
      image_url: presetForm.image_url,
    })
    setPresetForm({
      fabric_option_id: '',
      pattern_option_id: '',
      mordant_option_id: '',
      time_option_id: '',
      image_url: '',
    })
    load()
  }

  return (
    <div className='stack'>
      <SectionIntro title='色卡工具管理' description='管理色卡选项维度和四维组合预设效果图。' />
      <div className='two-col'>
        <div className='panel'>
          <div className='panel-title'>新增色卡选项</div>
          <FieldEditor
            field={{
              key: 'dimension_id',
              label: '所属维度',
              type: 'select',
              options: dimensions.map((item) => ({ label: item.name, value: String(item.id) })),
            }}
            value={optionForm.dimension_id}
            onChange={(value) => setOptionForm({ ...optionForm, dimension_id: value })}
          />
          <FieldEditor field={{ key: 'name', label: '选项名称', type: 'text' }} value={optionForm.name} onChange={(value) => setOptionForm({ ...optionForm, name: value })} />
          <FieldEditor field={{ key: 'sort_order', label: '排序', type: 'number' }} value={optionForm.sort_order} onChange={(value) => setOptionForm({ ...optionForm, sort_order: value })} />
          <div className='form-actions'>
            <button className='primary-btn' onClick={saveOption}>新增选项</button>
          </div>
          <SimpleTable
            columns={[
              { key: 'dimension_name', label: '维度' },
              { key: 'name', label: '选项名' },
              { key: 'sort_order', label: '排序' },
              { key: '__actions', label: '操作' },
            ]}
            rows={flatOptions.map((item) => ({
              ...item,
              __actions: <button className='link-btn danger' onClick={() => deleteOption(item.id)}>删除</button>,
            }))}
          />
        </div>
        <div className='panel'>
          <div className='panel-title'>新增预设效果图</div>
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
              onChange={(value) => setPresetForm({ ...presetForm, [key]: value })}
            />
          ))}
          <FieldEditor field={{ key: 'image_url', label: '效果图', type: 'image' }} value={presetForm.image_url} onChange={(value) => setPresetForm({ ...presetForm, image_url: value })} />
          <div className='form-actions'>
            <button className='primary-btn' onClick={savePreset}>新增预设</button>
          </div>
          <SimpleTable
            columns={[
              { key: 'fabric_option_id', label: '布料' },
              { key: 'pattern_option_id', label: '纹样' },
              { key: 'mordant_option_id', label: '媒染剂' },
              { key: 'time_option_id', label: '时长' },
              { key: 'image_url', label: '效果图' },
            ]}
            rows={presets}
          />
        </div>
      </div>
    </div>
  )
}

function MediaLibrarySection() {
  const [rows, setRows] = useState<any[]>([])
  const [type, setType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = () => {
    adminRequest<{ items: any[] }>(`/uploads?limit=200${type ? `&type=${encodeURIComponent(type)}` : ''}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`)
      .then((res) => setRows(res.items || []))
  }

  useEffect(() => {
    load()
  }, [type])

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await adminUpload(file)
      load()
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className='stack'>
      <SectionIntro title='媒体库' description='查看已上传的图片与视频，支持筛选、预览和继续复用。' />
      <div className='panel'>
        <div className='panel-header'>
          <div className='row gap'>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value=''>全部类型</option>
              <option value='image'>图片</option>
              <option value='video'>视频</option>
            </select>
            <input className='search-input' value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder='按文件名搜索' />
            <button className='ghost-btn' onClick={load}>搜索</button>
          </div>
          <label className='primary-btn upload-label'>
            {uploading ? '上传中...' : '上传文件'}
            <input type='file' hidden onChange={upload} />
          </label>
        </div>
        <div className='media-grid'>
          {rows.map((item) => (
            <div key={item.url} className='media-card'>
              {item.file_type === 'image' ? (
                <img src={fullUrl(item.url)} className='media-cover' />
              ) : (
                <video src={fullUrl(item.url)} className='media-cover' controls />
              )}
              <div className='media-meta'>
                <div className='media-name'>{item.filename}</div>
                <div className='media-url'>{item.url}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UserTasksSection() {
  const [rows, setRows] = useState<any[]>([])

  const load = () => {
    adminRequest<{ items: any[] }>('/user-tasks').then((res) => setRows(res.items || []))
  }

  useEffect(() => {
    load()
  }, [])

  const updateStatus = async (row: any, status: string) => {
    if (!window.confirm(`确认将任务状态修改为 ${status} 吗？`)) return
    await adminRequest(`/user-tasks/${row.id}`, 'PATCH', { status })
    load()
  }

  return (
    <div className='stack'>
      <SectionIntro title='用户任务审核' description='查看用户提交作品，并对任务状态进行审核确认。' />
      <div className='panel'>
        <SimpleTable
          columns={[
            { key: 'user_name', label: '用户' },
            { key: 'task_name', label: '任务' },
            { key: 'status', label: '状态' },
            { key: 'submit_description', label: '提交说明' },
            { key: '__actions', label: '操作' },
          ]}
          rows={rows.map((row) => ({
            ...row,
            user_name: row.user?.username,
            task_name: row.task?.name,
            __actions: (
              <div className='row-actions'>
                <button className='link-btn' onClick={() => updateStatus(row, 'submitted')}>标记已提交</button>
                <button className='link-btn' onClick={() => updateStatus(row, 'completed')}>标记完成</button>
              </div>
            ),
          }))}
        />
      </div>
    </div>
  )
}

function UserDiySection() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    adminRequest<{ items: any[] }>('/user-diy-records').then((res) => setRows(res.items || []))
  }, [])

  return (
    <div className='stack'>
      <SectionIntro title='用户 DIY 记录' description='查看用户保存的色卡和 DIY 记录预览。' />
      <div className='panel'>
        <SimpleTable
          columns={[
            { key: 'title', label: '标题' },
            { key: 'source_type', label: '来源类型' },
            { key: 'username', label: '用户' },
            { key: 'created_at', label: '创建时间' },
          ]}
          rows={rows.map((row) => ({
            ...row,
            username: row.user?.username,
          }))}
        />
      </div>
    </div>
  )
}

function UserManagementSection() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminRequest<{ items: any[] }>('/users')
      .then((res) => setRows(res.items || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const updateRole = async (user: any, role: string) => {
    if (!window.confirm(`确认将用户「${user.username}」的权限修改为 ${role === 'admin' ? '管理员' : role === 'worker' ? '工作者' : '游客'} 吗？`)) return
    try {
      const payload: Record<string, string> = { role }
      if (role === 'admin') {
        const password = window.prompt(`请为管理员「${user.username}」设置登录密码`)
        if (password === null) return
        if (!password.trim()) {
          window.alert('管理员密码不能为空')
          return
        }
        payload.password = password.trim()
      }
      await adminRequest(`/users/${user.id}/role`, 'PATCH', payload)
      load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '权限更新失败')
    }
  }

  return (
    <div className='stack'>
      <SectionIntro title='用户管理' description='查看所有注册用户，并修改其权限等级（游客、工作者、管理员）。' />
      <div className='panel'>
        <SimpleTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'avatar_url', label: '头像' },
            { key: 'username', label: '用户名' },
            { key: 'email', label: '邮箱' },
            { key: 'role_label', label: '当前权限' },
            { key: 'created_at', label: '注册时间' },
            { key: '__actions', label: '操作' },
          ]}
          rows={rows.map((row) => ({
            ...row,
            avatar_url: row.avatar_url ? <img src={row.avatar_url} className='mini-avatar' /> : '-',
            role_label: (
              <span className={`role-badge ${row.role}`}>
                {row.role === 'admin' ? '管理员' : row.role === 'worker' ? '工作者' : '游客'}
              </span>
            ),
            __actions: (
              <div className='row-actions'>
                <button className='link-btn' onClick={() => updateRole(row, 'tourist')}>设为游客</button>
                <button className='link-btn' onClick={() => updateRole(row, 'worker')}>设为工作者</button>
                <button className='link-btn' onClick={() => updateRole(row, 'admin')}>设为管理员</button>
              </div>
            ),
          }))}
          loading={loading}
        />
      </div>
    </div>
  )
}

function SiteConfigSection() {
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>([])

  const load = () => {
    adminRequest<{ items: Array<{ key: string; value: string }> }>('/site-config').then((res) => setRows(res.items || []))
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!window.confirm('确认保存站点配置吗？')) return
    await adminRequest('/site-config', 'PATCH', { items: rows })
    window.alert('保存成功')
  }

  return (
    <div className='stack'>
      <SectionIntro title='站点配置' description='管理默认二维码等基础配置项。' />
      <div className='panel'>
        {rows.map((row, index) => (
          <div className='config-row' key={`${row.key}-${index}`}>
            <input
              value={row.key}
              onChange={(e) => {
                const next = [...rows]
                next[index] = { ...next[index], key: e.target.value }
                setRows(next)
              }}
              placeholder='配置键'
            />
            <textarea
              value={row.value}
              onChange={(e) => {
                const next = [...rows]
                next[index] = { ...next[index], value: e.target.value }
                setRows(next)
              }}
              placeholder='配置值'
            />
          </div>
        ))}
        <div className='form-actions'>
          <button className='ghost-btn' onClick={() => setRows([...rows, { key: '', value: '' }])}>新增配置项</button>
          <button className='primary-btn' onClick={save}>保存配置</button>
        </div>
      </div>
    </div>
  )
}

function SectionIntro({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className='section-intro'>
      <div>
        <div className='section-title'>{title}</div>
        <div className='section-desc'>{description}</div>
      </div>
      {actions ? <div className='row gap'>{actions}</div> : null}
    </div>
  )
}

function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='panel'>
      <div className='panel-title'>{title}</div>
      <div className='form-list'>{children}</div>
    </div>
  )
}

function FieldEditor({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (value: any) => void }) {
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const uploaded = await adminUpload(file)
    onChange(uploaded.url)
    event.target.value = ''
  }

  return (
    <label className='field-block'>
      <span>{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ''} />
      ) : field.type === 'number' ? (
        <input type='number' value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ''} />
      ) : field.type === 'checkbox' ? (
        <input type='checkbox' checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      ) : field.type === 'select' ? (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value=''>请选择</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ''} />
      )}
      {field.type === 'image' || field.type === 'video' ? (
        <div className='upload-helper'>
          <label className='ghost-btn upload-label'>
            上传{field.type === 'image' ? '图片' : '视频'}
            <input type='file' accept={field.type === 'image' ? 'image/*' : 'video/*'} hidden onChange={uploadFile} />
          </label>
          {value ? (
            field.type === 'image' ? (
              <img src={fullUrl(value)} className='inline-preview' />
            ) : (
              <video src={fullUrl(value)} className='inline-preview' controls />
            )
          ) : null}
        </div>
      ) : null}
      {field.help ? <div className='field-help'>{field.help}</div> : null}
    </label>
  )
}

function splitTemplateParagraphs(text?: string) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function TextTemplatePreview({ text }: { text?: string }) {
  const blocks = splitTemplateParagraphs(text)
  if (blocks.length === 0) {
    return <div className='preview-sub'>输入文案后，这里会按照前端模板排版预览。</div>
  }

  return (
    <div className='text-template-list'>
      {blocks.map((block, index) => (
        <div className='text-template-block' key={`${block}-${index}`}>
          {block.split('\n').filter(Boolean).map((line, lineIndex) => (
            <p className='text-template-line' key={`${line}-${lineIndex}`}>{line}</p>
          ))}
        </div>
      ))}
    </div>
  )
}

function GenericPreview({ form }: { form: Record<string, any> }) {
  return (
    <div className='preview-card'>
      {form.image_url || form.cover_url ? <img className='preview-main-img' src={fullUrl(form.image_url || form.cover_url)} /> : null}
      <div className='preview-title'>{form.title || form.name || '未填写标题'}</div>
      {form.summary ? <div className='preview-sub'>{form.summary}</div> : null}
      {form.subtitle ? <div className='preview-sub'>{form.subtitle}</div> : null}
      {form.icon ? <div className='preview-sub'>图标：{form.icon}</div> : null}
      {form.link_type ? <div className='preview-sub'>跳转：{form.link_type}</div> : null}
      {form.detail_html ? <TextTemplatePreview text={form.detail_html} /> : null}
      {form.body_html ? <TextTemplatePreview text={form.body_html} /> : null}
      {form.notice_html ? <TextTemplatePreview text={form.notice_html} /> : null}
    </div>
  )
}

function ProductPreview({ product }: { product: any }) {
  const steps = String(product.process_text || '')
    .split(/\s*->\s*|\s*→\s*/)
    .filter(Boolean)

  return (
    <div className='product-preview-card'>
      {(product.gallery?.length || 0) > 0 ? (
        <div className='preview-strip'>
          {product.gallery.map((item: any, index: number) => (
            <img key={`${item.url}-${index}`} src={fullUrl(item.url)} className='preview-thumb' />
          ))}
        </div>
      ) : product.cover_url ? (
        <img className='preview-main-img' src={fullUrl(product.cover_url)} />
      ) : null}
      <div className='preview-title'>{product.name || '未填写商品名称'}</div>
      <div className='preview-sub'>{product.summary || '这里显示商品简介。'}</div>
      <div className='preview-meta'>产地：{product.origin || '未填写'}</div>
      <div className='preview-meta'>出品方：{product.producer || '未填写'}</div>
      {steps.length ? (
        <div className='chip-row'>
          {steps.map((step) => (
            <span className='chip' key={step}>{step}</span>
          ))}
        </div>
      ) : null}
      {(product.flow_steps || []).map((item: any, index: number) => (
        <div className='step-preview' key={`${item.image_url}-${index}`}>
          {item.image_url ? <img src={fullUrl(item.image_url)} className='step-preview-img' /> : null}
          <div className='preview-sub'>{item.caption || '步骤说明'}</div>
        </div>
      ))}
      {product.detail_html ? <TextTemplatePreview text={product.detail_html} /> : null}
      {product.qr_code_url ? <img src={fullUrl(product.qr_code_url)} className='qr-preview' /> : null}
    </div>
  )
}

function PreviewBlock({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className='panel'>
      <div className='panel-header'>
        <div className='panel-title'>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function PreviewCard({ title, subtitle, image }: { title?: string; subtitle?: string; image?: string }) {
  return (
    <div className='preview-tile'>
      {image ? <img src={fullUrl(image)} className='preview-tile-img' /> : null}
      <div className='preview-tile-title'>{title || '未命名内容'}</div>
      {subtitle ? <div className='preview-tile-sub'>{subtitle}</div> : null}
    </div>
  )
}

function SimpleTable({
  columns,
  rows,
  loading,
}: {
  columns: Array<{ key: string; label: string }>
  rows: any[]
  loading?: boolean
}) {
  return (
    <div className='table-wrap'>
      <table className='data-table'>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length}>加载中...</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>暂无数据</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || row.key || index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {typeof row[column.key] === 'boolean'
                      ? row[column.key]
                        ? '是'
                        : '否'
                      : row[column.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className='metric-card'>
      <div className='metric-label'>{label}</div>
      <div className='metric-value'>{value ?? 0}</div>
    </div>
  )
}

function summarizeTop(events: any[]) {
  const counter = new Map<string, number>()
  events.forEach((item) => {
    const key = `${item.target_type || item.event_type}:${item.target_id || item.page_path || 'unknown'}`
    counter.set(key, (counter.get(key) || 0) + 1)
  })
  return [...counter.entries()]
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function summarizePages(events: any[]) {
  const counter = new Map<string, number>()
  events.forEach((item) => {
    const key = item.page_path || 'unknown'
    counter.set(key, (counter.get(key) || 0) + 1)
  })
  return [...counter.entries()]
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function replaceId(path: string, id: string | number) {
  return path.replace(':id', String(id))
}

function initialForm(fields: FieldConfig[], source: Record<string, any>) {
  const result: Record<string, any> = {}
  fields.forEach((field) => {
    if (field.type === 'checkbox') result[field.key] = Boolean(source[field.key])
    else result[field.key] = source[field.key] ?? ''
  })
  return result
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

function fullUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  const base = API_BASE.replace(/\/api\/v1$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
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

export default App
