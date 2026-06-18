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
