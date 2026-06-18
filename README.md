# 饶有趣

`饶有趣` 是一个面向微信小程序场景的展示型公益文化平台，围绕饶平非遗、茶染文创、体验活动、扶残帮残任务与色卡互动工具提供内容展示、互动记录和后台运营能力。

当前仓库中的实现以“可演示、可维护、可继续治理”为目标，包含：

- 微信小程序客户端：`miniapp-taro/`
- React 管理端：`admin-web/`
- Flask 后端：`backend/`

项目 **不包含线上交易、支付和结算**，商品详情的核心 CTA 是“我想要”二维码引流。

## 当前技术栈

| 模块 | 技术栈 | 说明 |
| --- | --- | --- |
| 小程序客户端 | Taro 4 + React 18 + TypeScript + Sass | 主端代码在 `miniapp-taro/` |
| PC 管理端 | React 18 + Vite + TypeScript | 实际代码在 `admin-web/`，不是 Vue |
| 后端服务 | Flask + Flask-SQLAlchemy + Flask-Migrate + Alembic + PyJWT | API、鉴权、迁移与后台接口 |
| 数据库 | SQLite / MySQL | 默认本地 SQLite，可通过 `DATABASE_URL` 切换 MySQL |
| 媒体处理 | Pillow | 上传图片真实性校验 |

## 目录结构

```text
ryq/
├─ admin-web/              # React 管理端
├─ backend/
│  ├─ migrations/          # Alembic 迁移
│  ├─ raoyouqu/            # Flask 应用
│  ├─ scripts/             # 辅助脚本（素材同步、API 文档生成）
│  ├─ run.py               # 后端入口
│  └─ requirements.txt
├─ miniapp-taro/           # Taro 小程序
├─ img/                    # 本地素材源
└─ apifox.json             # 由脚本生成的 OpenAPI / Apifox 文档
```

## 已实现的核心能力

- 首页内容聚合：视频、PPT、图文、Banner、项目亮点
- 饶平文创：商品列表、详情、图集、流程图、“我想要”二维码
- 玩转饶平：体验项目列表与详情
- 认识饶平：宣传视频与文化图文
- 扶残帮残：任务展示、接取、提交作品、后台任务监控
- 色卡工具：四维选项、预设图查询、DIY 记录保存
- 用户中心：邮箱登录/绑定、收藏、DIY 记录、浏览足迹
- 后台管理：首页、商品、体验、文化、任务、色卡、站点配置、数据概览

## 近期已完成的治理项

- 停止应用启动时自动执行数据库迁移
- 微信配置缺失时仅开发环境允许 mock，生产不再静默伪造身份
- 小程序与管理端 API 地址改为环境可配置
- 管理员发布商品收口到 `AdminUser`
- 上传接口增加后缀、MIME、文件大小、内容真实性校验
- 邮箱验证码改为数据库持久化，并支持一次性消费
- 色卡四维组合增加唯一约束，并补后台查重
- 种子初始化链路按环境收紧，非开发环境默认不再静默写占位图

## 环境要求

- Windows / macOS / Linux
- Node.js 18+
- Python 3.10+
- 可选：MySQL 8+

## 后端启动

### 1. 安装依赖

```bash
cd backend
py -3 -m pip install -r requirements.txt
```

如需跑测试：

```bash
py -3 -m pip install -r requirements-dev.txt
```

### 2. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`，至少关注以下变量：

```env
APP_ENV=development
ALLOW_PLACEHOLDER_SEED_DATA=true

DATABASE_URL=
JWT_SECRET=

WX_APPID=
WX_SECRET=
WECHAT_ALLOW_MOCK=true

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@example.com

EMAIL_PROVIDER=mock
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_USE_TLS=true
```

说明：

- `DATABASE_URL` 留空时默认使用 `backend/data.db`
- `APP_ENV=development` 时允许部分开发 mock
- `ALLOW_PLACEHOLDER_SEED_DATA` 建议只在开发环境开启
- 生产环境必须配置 `JWT_SECRET`、`WX_APPID`、`WX_SECRET`

### 3. 初始化数据库

查看当前迁移状态：

```bash
py -3 -m flask --app run.py db current
py -3 -m flask --app run.py db heads
```

执行迁移：

```bash
py -3 -m flask --app run.py db upgrade
```

当前仓库最新迁移版本为：

```text
c3d4e5f6a7b8
```

### 4. 启动后端

```bash
py -3 run.py
```

默认地址：

```text
http://127.0.0.1:5000
```

## 小程序启动

```bash
cd miniapp-taro
npm install
npm run dev:weapp
```

可通过环境变量覆盖 API 地址：

```env
TARO_APP_API_BASE=http://127.0.0.1:5000/api/v1
```

## 管理端启动

```bash
cd admin-web
npm install
npm run dev
```

可通过以下方式覆盖管理端 API 地址：

- `VITE_API_BASE`
- 浏览器运行时注入 `window.__RYQ_ADMIN_API_BASE__`

默认开发地址：

```text
http://127.0.0.1:5000/api/v1
```

## 素材与初始化

后端的 `seed.py` 仅负责基础数据和开发环境演示数据。

如果要把仓库中的真实素材同步到数据库和静态目录，请使用：

```bash
cd backend
py -3 scripts/sync_img_assets.py
```

这会把 `img/` 里的素材复制到 `backend/raoyouqu/static/uploads/`，并重建首页、商品、文化等演示内容。

## API 文档

仓库只保留一套 API 文档产物：

- 生成脚本：`backend/scripts/generate_apifox.py`
- 生成结果：`apifox.json`

生成命令：

```bash
cd backend
py -3 scripts/generate_apifox.py
```

说明：

- `apifox.json` 是当前 Flask 路由的导出结果
- 请不要再手工维护其它 OpenAPI / Apifox JSON 副本
- 若接口有改动，先改代码，再重新生成 `apifox.json`

## 鉴权说明

### 用户端

- 微信登录：`POST /api/v1/auth/wechat`
- 邮箱验证码登录：`POST /api/v1/auth/send-code` + `POST /api/v1/auth/email-login`
- 访客登录：`POST /api/v1/auth/guest`

### 管理端

- 管理员登录：`POST /api/v1/admin/auth/login`
- 登录成功后使用 `Authorization: Bearer <token>`

### Token 规则

- 用户接口使用 `typ=user`
- 管理端接口使用 `typ=admin`
- 管理端接口拒绝用户 token 冒用

## 上传规则

### 用户端 `/api/v1/upload`

- 只允许图片
- 校验后缀、声明 MIME、真实图片内容
- 默认大小限制为 10MB

### 管理端 `/api/v1/admin/upload`

- 允许图片和视频
- 图片默认大小限制为 20MB
- 视频默认大小限制为 100MB
- 会校验后缀、声明 MIME、文件头/真实内容

## 自动化测试

最小可用测试放在 `backend/tests/`，优先覆盖：

- 鉴权收口
- 上传校验
- 邮箱验证码持久化与一次性消费
- 色卡唯一约束相关链路

运行方式：

```bash
cd backend
py -3 -m pytest
```

## 常用命令

```bash
# 后端迁移到最新
py -3 -m flask --app run.py db upgrade

# 查看当前迁移版本
py -3 -m flask --app run.py db current

# 生成 API 文档
py -3 scripts/generate_apifox.py

# 同步真实素材
py -3 scripts/sync_img_assets.py

# 运行后端测试
py -3 -m pytest
```

## 当前默认账号

当数据库中没有管理员时，后端会根据环境变量写入默认管理员：

- 用户名：`admin`
- 密码：`admin123`
- 邮箱：`admin@example.com`

生产环境请务必通过环境变量覆盖。

## 已知约束

- 项目仍同时存在 PC 管理端和小程序内嵌管理页，两套后台能力尚未完全收口
- `apifox.json` 为路由级生成文档，响应 schema 仍以通用对象为主，后续可继续细化
- 当前测试体系是最小可用集，仍需逐步补充更完整的回归覆盖
