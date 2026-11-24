import Taro from '@tarojs/taro'

/**
 * 安全返回：页面栈深度 > 1 时正常 navigateBack，
 * 栈底（例如 reLaunch 跳转后）则 reLaunch 到兜底页，避免
 * `navigateBack:fail cannot navigate back at first page.` 报错。
 */
export function navigateBackOrRelaunch(fallbackUrl = '/pages/index/index', delta = 1) {
  const fallback = () => {
    try {
      void Taro.reLaunch({ url: fallbackUrl })
    } catch {
      /* 忽略兜底跳转异常 */
    }
  }
  let length = 0
  try {
    const pages = typeof Taro.getCurrentPages === 'function' ? Taro.getCurrentPages() : []
    length = Array.isArray(pages) ? pages.length : 0
  } catch {
    length = 0
  }
  // 栈底（例如登录页 reLaunch 回礼盒后栈深为 1）：根本不调 navigateBack，直接 reLaunch
  if (length <= delta) {
    fallback()
    return
  }
  try {
    // 即使 JS 侧栈深判断通过、原生栈实际已是栈底，fail 回调 + promise catch 双兜底跳兜底页
    const ret = Taro.navigateBack({
      delta,
      fail: () => fallback(),
    }) as unknown as Promise<unknown> | undefined
    if (ret && typeof (ret as Promise<unknown>).catch === 'function') {
      ;(ret as Promise<unknown>).catch(() => fallback())
    }
  } catch {
    fallback()
  }
}
