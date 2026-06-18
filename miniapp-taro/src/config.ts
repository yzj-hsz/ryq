declare const __API_BASE__: string | undefined

/** 开发时在微信开发者工具关闭「校验合法域名」；真机预览请通过 TARO_APP_API_BASE 注入局域网或正式地址。 */
export const API_BASE =
  (typeof __API_BASE__ !== 'undefined' && __API_BASE__) || 'http://127.0.0.1:5000/api/v1'
