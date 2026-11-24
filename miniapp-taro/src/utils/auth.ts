import Taro from '@tarojs/taro'

export const AUTH_TOKEN_KEY = 'ryq_auth_token'
export const ADMIN_AUTH_TOKEN_KEY = 'ryq_admin_auth_token'
export const ADMIN_PROFILE_KEY = 'ryq_admin_profile'

export function getToken(): string {
  return Taro.getStorageSync(AUTH_TOKEN_KEY) || ''
}

export function setToken(token: string) {
  Taro.setStorageSync(AUTH_TOKEN_KEY, token)
}

export function clearToken() {
  Taro.removeStorageSync(AUTH_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export interface SimpleUser {
  role?: string | null
  username?: string | null
}

/** 与 ProfileTab / CultureTab 保持一致的访客判定：tourist + “访客”前缀 */
export function isGuestUser(user: SimpleUser | null | undefined): boolean {
  if (!user) return false
  return user.role === 'tourist' && (user.username ?? '').startsWith('访客')
}

/**
 * 跳转到登录页。
 * - 会先清掉访客 token，否则登录页 useDidShow 检测到 token 会直接 reLaunch 回首页，导致无法登录
 * - redirect：登录成功后回跳的页面路径（含参数），例如 /pages/giftbox/custom?box_id=1
 */
export function goLoginPage(redirect?: string) {
  clearToken()
  try {
    const query = redirect ? `?from=guest&redirect=${encodeURIComponent(redirect)}` : '?from=guest'
    Taro.reLaunch({ url: `/pages/login/login${query}` })
  } catch {
    /* 忽略跳转异常 */
  }
}

export function getAdminToken(): string {
  return Taro.getStorageSync(ADMIN_AUTH_TOKEN_KEY) || ''
}

export function setAdminToken(token: string) {
  Taro.setStorageSync(ADMIN_AUTH_TOKEN_KEY, token)
}

export function clearAdminToken() {
  Taro.removeStorageSync(ADMIN_AUTH_TOKEN_KEY)
}

export interface StoredAdminProfile {
  id: number
  username: string
  display_name?: string
  email?: string
}

export function getAdminProfile(): StoredAdminProfile | null {
  return Taro.getStorageSync(ADMIN_PROFILE_KEY) || null
}

export function setAdminProfile(profile: StoredAdminProfile) {
  Taro.setStorageSync(ADMIN_PROFILE_KEY, profile)
}

export function clearAdminProfile() {
  Taro.removeStorageSync(ADMIN_PROFILE_KEY)
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken()
}
