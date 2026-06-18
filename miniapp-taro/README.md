# 饶有趣小程序（Taro + React）

由原 uni-app + Vue3 重构为 **Taro 4 + React 18 + TypeScript**，UI 使用 **NutUI React Taro**，视觉主题与原型暖色公益风保持一致（`src/styles/theme.scss`）。

## 开发

```bash
cd miniapp-taro
npm install
npm run dev:weapp
```

微信开发者工具打开 **`miniapp-taro/dist`** 目录（与 `project.config.json` 中 `miniprogramRoot` 一致）。

## 配置

- API 地址：`src/config.ts` 中的 `API_BASE`
- 开发时关闭「校验合法域名」

## 目录

| 路径 | 说明 |
|------|------|
| `src/pages/index` | 首页 + 底部五栏 Tab |
| `src/components/tabs` | 各 Tab 内容 |
| `src/api` | 与后端 `/api/v1` 对接 |
| `src/styles/theme.scss` | 全局色板（与旧版一致） |

旧版 uni-app 源码保留在 `miniapp/`（未删除，便于对照）。
