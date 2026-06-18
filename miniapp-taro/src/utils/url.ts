import { API_BASE } from '@/config'

const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

export function formatUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '')
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  return `${origin}${normalizedUrl}`
}
