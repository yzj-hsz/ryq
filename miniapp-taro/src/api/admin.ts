import Taro from '@tarojs/taro'
import { API_BASE } from '@/config'
import { getAdminToken } from '@/utils/auth'
import { request } from './http'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface AdminUserProfile {
  id: number
  username: string
  display_name?: string
  email?: string
}

export interface AdminSummary {
  total_users: number
  new_users_today: number
  today_pv: number
  today_uv: number
  total_want_clicks: number
  total_color_card_uses: number
}

export interface AdminCrudItem {
  id: number
  [key: string]: unknown
}

export interface AdminListResponse<T> {
  items: T[]
}

export interface AdminUploadItem {
  filename: string
  url: string
  mime_type: string
  file_type: string
  size_bytes: number
  updated_at: string
}

export interface AdminUserTask {
  id: number
  user?: { id: number; username: string; avatar_url?: string }
  task?: { id: number; name: string; category: string }
  status: string
  submit_image_url?: string | null
  submit_description?: string | null
  accepted_at?: string | null
  submitted_at?: string | null
  completed_at?: string | null
}

export interface AdminUserDiyRecord {
  id: number
  user?: { id: number; username: string; avatar_url?: string | null }
  source_type: string
  source_id?: number | null
  payload?: any
  preview_image_url?: string | null
  title?: string | null
  created_at?: string | null
}

export interface AdminUserItem {
  id: number
  openid: string
  username: string
  avatar_url?: string | null
  email?: string | null
  role: 'tourist' | 'worker' | 'admin'
  has_password?: boolean
  created_at: string
  last_visit_at?: string | null
}

export interface AnalyticsEventItem {
  id: number
  user_id?: number | null
  event_type: string
  page_path?: string | null
  target_type?: string | null
  target_id?: string | null
  meta_json?: string | null
  created_at?: string | null
}

export interface ColorCardDimension {
  id: number
  code: string
  name: string
  options: Array<{ id: number; name: string; sort_order: number }>
}

export interface ColorCardPreset {
  id: number
  fabric_option_id: number
  pattern_option_id: number
  mordant_option_id: number
  time_option_id: number
  image_url: string
}

function adminRequest<T>(path: string, method: Method = 'GET', body?: unknown) {
  return request<T>(`/admin${path}`, method, body, { tokenType: 'admin' })
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${path}?${query}` : path
}

export function getAssetUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  const origin = API_BASE.replace(/\/api\/v1$/, '')
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}

export function postAdminLogin(username: string, password: string) {
  return request<{ token: string; admin: AdminUserProfile }>(
    '/admin/auth/login',
    'POST',
    { username, password },
    { auth: false }
  )
}

export function fetchAdminSummary() {
  return adminRequest<{ summary: AdminSummary }>('/dashboard/summary')
}

export function fetchAnalyticsEvents(eventType?: string, limit = 100) {
  return adminRequest<AdminListResponse<AnalyticsEventItem>>(
    withQuery('/analytics/events', { event_type: eventType, limit })
  )
}

export function fetchAdminList<T extends AdminCrudItem>(path: string) {
  return adminRequest<AdminListResponse<T>>(path)
}

export function fetchAdminDetail<T>(path: string) {
  return adminRequest<T>(path)
}

export function createAdminItem<T>(path: string, body: Record<string, unknown>) {
  return adminRequest<T>(path, 'POST', body)
}

export function updateAdminItem<T>(path: string, body: Record<string, unknown>) {
  return adminRequest<T>(path, 'PATCH', body)
}

export function deleteAdminItem<T>(path: string) {
  return adminRequest<T>(path, 'DELETE')
}

export function fetchHomeIntroText() {
  return adminRequest<{ text: string; html: string }>('/home/intro-text')
}

export function saveHomeIntroText(text: string) {
  return adminRequest<{ ok: boolean }>('/home/intro-text', 'POST', { text })
}

export function fetchSiteConfig() {
  return adminRequest<{ items: Array<{ key: string; value: string }> }>('/site-config')
}

export function saveSiteConfig(items: Array<{ key: string; value: string }>) {
  return adminRequest<{ ok: boolean }>('/site-config', 'PATCH', { items })
}

export function fetchCulturePromo() {
  return adminRequest<{
    id?: number
    title: string
    subtitle: string
    cover_url: string
    video_url?: string | null
  }>('/culture/promo')
}

export function saveCulturePromo(body: Record<string, unknown>) {
  return adminRequest('/culture/promo', 'PATCH', body)
}

export function fetchUploads(params: { type?: string; keyword?: string; ext?: string; limit?: number } = {}) {
  return adminRequest<{ total: number; items: AdminUploadItem[] }>(
    withQuery('/uploads', {
      type: params.type,
      keyword: params.keyword,
      ext: params.ext,
      limit: params.limit ?? 100,
    })
  )
}

export async function uploadAdminLocalFile(filePath: string, name?: string) {
  const token = getAdminToken()
  const res = await Taro.uploadFile({
    url: `${API_BASE}/admin/upload`,
    filePath,
    name: 'file',
    header: token ? { Authorization: `Bearer ${token}` } : {},
    formData: name ? { filename: name } : undefined,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`HTTP ${res.statusCode}`)
  }
  const data = JSON.parse(res.data || '{}') as { url?: string; filename?: string; error?: string }
  if (!data.url) {
    throw new Error(data.error || '上传失败')
  }
  return data
}

export function fetchProductList() {
  return adminRequest<AdminListResponse<AdminCrudItem>>('/products')
}

export function fetchProductDetail(id: number) {
  return adminRequest<AdminCrudItem>(`/products/${id}`)
}

export function fetchColorCardOptions() {
  return adminRequest<{ dimensions: ColorCardDimension[] }>('/color-card/options')
}

export function fetchColorCardPresets() {
  return adminRequest<{ items: ColorCardPreset[] }>('/color-card/presets')
}

export function fetchUserTasks() {
  return adminRequest<{ items: AdminUserTask[] }>('/user-tasks')
}

export function updateUserTask(id: number, status: string) {
  return adminRequest<{ ok: boolean }>(`/user-tasks/${id}`, 'PATCH', { status })
}

export function fetchUserDiyRecords() {
  return adminRequest<{ items: AdminUserDiyRecord[] }>('/user-diy-records')
}

export function fetchUserList() {
  return adminRequest<{ items: AdminUserItem[] }>('/users')
}

export function deleteUser(id: number) {
  return adminRequest<{ ok: boolean }>(`/users/${id}`, 'DELETE')
}

export function updateUserRole(id: number, role?: string, password?: string) {
  return adminRequest<{ ok: boolean; role: string }>(`/users/${id}/role`, 'PATCH', { role, password })
}
