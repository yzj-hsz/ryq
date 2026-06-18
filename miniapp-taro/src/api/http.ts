import Taro from '@tarojs/taro'
import { API_BASE } from '@/config'
import { getAdminToken, getToken } from '@/utils/auth'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type TokenType = 'user' | 'admin'

export function request<T>(
  path: string,
  method: Method = 'GET',
  data?: unknown,
  options?: { auth?: boolean; tokenType?: TokenType }
): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const needAuth = options?.auth !== false
  if (needAuth) {
    const t = options?.tokenType === 'admin' ? getAdminToken() : getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }

  return Taro.request({
    url,
    method,
    timeout: 60000,
    data: method !== 'GET' ? data : undefined,
    header: headers,
  }).then((res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T
    }
    console.error(`API Error [${method}] ${url}:`, res.statusCode, res.data)
    throw new Error(`HTTP ${res.statusCode}`)
  }).catch((err) => {
    console.error(`Network Error [${method}] ${url}:`, err)
    const msg = err?.errMsg || err?.message || '网络请求失败'
    if (msg.includes('timeout')) {
      throw new Error(`请求超时(${url})，请确认后端服务已启动且网络可达`)
    }
    throw new Error(msg)
  })
}
