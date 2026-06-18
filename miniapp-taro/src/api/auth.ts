import { request } from './http'

export interface AuthUser {
  id: number
  username: string
  avatar_url: string | null
  email: string | null
  role: 'tourist' | 'worker' | 'admin'
  stats?: { diy_count: number; favorite_count: number }
  created_at: string | null
}

export function postWechatLogin(code: string) {
  return request<{ token: string; user: AuthUser }>('/auth/wechat', 'POST', { code }, { auth: false })
}

export function postBindEmail(email: string, code: string) {
  return request<{ token: string; user: AuthUser }>('/auth/email', 'POST', { email, code })
}

export function postSendCode(email: string) {
  return request<{ ok: boolean; msg: string }>(
    '/auth/send-code',
    'POST',
    { email },
    { auth: false }
  )
}

export function postEmailLogin(email: string, code: string, username: string) {
  return request<{ token: string; user: AuthUser }>(
    '/auth/email-login',
    'POST',
    { email, code, username },
    { auth: false }
  )
}

export function postGuestLogin() {
  return request<{ token: string; user: AuthUser }>('/auth/guest', 'POST', {}, { auth: false })
}

export function fetchMe() {
  return request<AuthUser>('/me', 'GET')
}

export function patchMe(data: { username?: string; avatar_url?: string }) {
  return request<{ ok: boolean }>('/me', 'PATCH', data)
}
