export const API_BASE =
  (window as Window & { __RYQ_ADMIN_API_BASE__?: string }).__RYQ_ADMIN_API_BASE__ ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'http://127.0.0.1:5000/api/v1'

const TOKEN_KEY = 'ryq_admin_token'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export async function request<T>(
  path: string,
  method: Method = 'GET',
  body?: unknown,
  withAdminAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (withAdminAuth && getAdminToken()) {
    headers.Authorization = `Bearer ${getAdminToken()}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.message || '请求失败')
  }
  return data as T
}

export function adminRequest<T>(path: string, method: Method = 'GET', body?: unknown) {
  return request<T>(`/admin${path}`, method, body, true)
}

export function publicRequest<T>(path: string, method: Method = 'GET', body?: unknown) {
  return request<T>(path, method, body, false)
}

export async function adminUpload(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return adminRequest<{ url: string; filename: string }>('/upload', 'POST', formData)
}

export function fetchHomeIntroText() {
  return adminRequest<{ text: string; html: string }>('/home/intro-text')
}

export function saveHomeIntroText(text: string) {
  return adminRequest<{ ok: boolean }>('/home/intro-text', 'POST', { text })
}

export async function loginAdmin(username: string, password: string) {
  return request<{ token: string; admin: { username: string; display_name?: string; email?: string } }>(
    '/admin/auth/login',
    'POST',
    { username, password },
    false,
  )
}
