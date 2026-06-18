import Taro from '@tarojs/taro'
import { API_BASE } from '@/config'
import { request } from './http'
import type {
  ColorOption,
  CultureArticle,
  ExperienceItem,
  HomePayload,
  ProductDetail,
  ProductListItem,
  TaskBrief,
} from './types'

export function fetchHome() {
  return request<HomePayload>('/home', 'GET')
}

export function fetchHighlightDetail(id: number) {
  return request<{ id: number; icon: string; title: string; summary: string; image_url: string; detail_html: string }>(
    `/home/highlights/${id}`,
    'GET'
  )
}

export function fetchBannerDetail(id: number) {
  return request<{ id: number; title: string; image_url: string; detail_html: string }>(
    `/home/banners/${id}`,
    'GET'
  )
}

export function fetchProducts(params: {
  list_category?: string
  keyword?: string
  primary_category?: string
  product_type?: '礼盒' | '助农' | '匠心'
}) {
  const queryParts: string[] = []
  if (params.list_category) queryParts.push(`list_category=${encodeURIComponent(params.list_category)}`)
  if (params.keyword) queryParts.push(`keyword=${encodeURIComponent(params.keyword)}`)
  if (params.primary_category) queryParts.push(`primary_category=${encodeURIComponent(params.primary_category)}`)
  if (params.product_type) queryParts.push(`product_type=${encodeURIComponent(params.product_type)}`)
  const q = queryParts.join('&')
  return request<{ items: ProductListItem[] }>(`/products${q ? `?${q}` : ''}`, 'GET')
}

export function fetchProductDetail(id: number) {
  return request<ProductDetail>(`/products/${id}`, 'GET')
}

export function fetchWantQrcode(productId: number) {
  return request<{ qrcode_url: string; is_default?: boolean }>(
    `/products/${productId}/want-qrcode`,
    'GET'
  )
}

export function postWantClick(productId: number) {
  return request<{ ok: boolean }>(`/products/${productId}/want-click`, 'POST')
}


export function postAnalyticsEvent(payload: {
  event_type: string
  page_path?: string
  target_type?: string
  target_id?: number
  meta?: Record<string, unknown>
}) {
  return request<{ ok: boolean }>('/analytics/events', 'POST', payload, { auth: false })
}


export function fetchColorCardOptions() {
  return request<{ dimensions: { code: string; name: string; options: ColorOption[] }[] }>(
    '/color-card/options',
    'GET'
  )
}

export function fetchColorPreset(
  fabricId: number,
  patternId: number,
  mordantId: number,
  timeId: number
) {
  const q = `fabric_id=${fabricId}&pattern_id=${patternId}&mordant_id=${mordantId}&time_id=${timeId}`
  return request<{ image_url: string | null }>(`/color-card/preset?${q}`, 'GET')
}

export function fetchExperiences(region: 'shenzhen' | 'raoping') {
  return request<{ items: ExperienceItem[] }>(`/experiences?region=${region}`, 'GET')
}

export function fetchExperienceDetail(id: number) {
  return request<Record<string, unknown>>(`/experiences/${id}`, 'GET')
}

export function fetchCultureArticles() {
  return request<{ items: CultureArticle[] }>('/culture/articles', 'GET')
}

export function fetchCulturePromo() {
  return request<{ title: string; subtitle?: string; cover_url: string; video_url: string | null }>(
    '/culture/promo',
    'GET'
  )
}

export function fetchCultureArticleDetail(id: number) {
  return request<{ id: number; title: string; body_html: string; cover_url: string; summary: string }>(
    `/culture/articles/${id}`,
    'GET'
  )
}

export function fetchTaskShowcases() {
  return request<{ items: TaskBrief[] }>('/task-showcases', 'GET')
}

export function fetchTaskDetail(id: number) {
  return request<Record<string, unknown>>(`/task-showcases/${id}`, 'GET')
}

export function postAcceptTask(id: number) {
  return request<{ id: number; status: string }>(`/task-showcases/${id}/accept`, 'POST')
}

export function postSubmitTask(id: number, imageUrl: string, description: string) {
  return request<{ ok: boolean; status: string }>(`/task-showcases/${id}/submit`, 'POST', {
    image_url: imageUrl,
    description,
  })
}

export function fetchMyTasks() {
  return request<{ items: any[] }>('/me/tasks', 'GET')
}

export async function uploadFile(filePath: string) {
  const { getToken } = await import('@/utils/auth')
  const token = getToken()
  const res = await Taro.uploadFile({
    url: `${API_BASE}/upload`,
    filePath,
    name: 'file',
    timeout: 60000,
    header: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`HTTP ${res.statusCode}`)
  }
  return JSON.parse(res.data || '{}') as { url: string; filename: string }
}

export function fetchMyDiyRecords() {
  return request<{
    items: Array<{
      id: number
      source_type: string
      source_id?: number
      payload: any
      preview_image_url: string
      title?: string
      created_at: string
    }>
  }>('/me/diy-records', 'GET')
}

export function postSaveDiyRecord(data: {
  source_type: string
  source_id?: number
  payload: any
  preview_image_url: string
  title?: string
}) {
  return request<{ id: number }>('/me/diy-records', 'POST', data)
}

export function deleteDiyRecord(id: number) {
  return request<{ ok: boolean }>(`/me/diy-records/${id}`, 'DELETE')
}

export function patchDiyRecord(id: number, data: { title?: string; payload?: any }) {
  return request<{ ok: boolean }>(`/me/diy-records/${id}`, 'PATCH', data)
}
