# 接单监控工具 | Job Monitor

[中文](#中文) | [English](#english)

---

## 中文

自动监控猪八戒、程序员客栈等自由职业平台，新需求第一时间通过飞书/微信推送通知。

### 功能特性

- **多平台监控** — 同时监控猪八戒、程序员客栈，一个工具覆盖主流接单平台
- **关键词精准匹配** — 自定义关键词和预算范围，只推送你关心的需求
- **飞书/微信实时推送** — 每 30 分钟自动检测新需求，通过飞书 Webhook 或微信 Server 酱即时通知
- **短链接点击追踪** — 追踪用户点击行为，验证推送效果
- **邀请裂变** — 内置 ref 邀请追踪机制

### 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + Tailwind CSS |
| 后端 | Next.js API Routes + Supabase (Auth + PostgreSQL) |
| 爬虫 | Python 3.11 + Requests + BeautifulSoup |
| 定时任务 | GitHub Actions (每 30 分钟) |
| 部署 | Vercel (前端) + GitHub Actions (爬虫) |

### 项目结构

```
├── web/                    # Next.js 前端应用
│   ├── src/app/            # 页面和 API 路由
│   │   ├── api/configs/    # 监控配置 CRUD API
│   │   ├── api/go/         # 短链接点击追踪
│   │   ├── dashboard/      # 监控配置管理页面
│   │   ├── login/          # 手机号验证码登录
│   │   └── records/        # 推送记录页面
│   ├── src/components/     # 共享组件
│   └── src/lib/            # Supabase 客户端和类型定义
├── crawler/                # Python 爬虫
│   ├── scrapers/           # 平台爬虫（猪八戒、程序员客栈）
│   ├── notifiers/          # 通知推送（飞书、微信）
│   ├── main.py             # 爬虫主入口
│   └── db.py               # 数据库操作
├── supabase/               # 数据库迁移文件
└── .github/workflows/      # GitHub Actions 定时任务
```

### 快速开始

#### 1. 配置 Supabase

- 创建 [Supabase](https://supabase.com) 项目
- 在 SQL Editor 中依次执行 `supabase/migrations/001_initial_schema.sql` 和 `002_add_referral.sql`

#### 2. 启动前端

```bash
cd web
cp .env.local.example .env.local
# 编辑 .env.local，填入 Supabase 项目的 URL 和 Key
npm install
npm run dev
```

访问 http://localhost:3000

#### 3. 运行爬虫（本地测试）

```bash
cd crawler
pip install -r requirements.txt
# 设置环境变量
export SUPABASE_URL=your-supabase-url
export SUPABASE_SERVICE_KEY=your-service-key
python main.py
```

#### 4. 部署

**前端 → Vercel：**
- 导入 `web/` 目录到 Vercel
- 配置环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`

**爬虫 → GitHub Actions：**
- 在仓库 Settings → Secrets 中添加：`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`FEISHU_DEV_WEBHOOK`、`SITE_URL`
- 爬虫会每 30 分钟自动运行，也支持手动触发

### 许可证

MIT

---

## English

Automatically monitor freelance platforms (Zhubajie, Proginn) and get instant notifications via Feishu/WeChat when new jobs match your criteria.

### Features

- **Multi-platform monitoring** — Monitor Zhubajie and Proginn simultaneously
- **Keyword matching** — Custom keywords and budget filters, only get notified for relevant jobs
- **Real-time notifications** — Feishu Webhook or WeChat (ServerChan) push every 30 minutes
- **Click tracking** — Short link redirects with click tracking to measure engagement
- **Referral system** — Built-in ref-based invite tracking

### Tech Stack

| Module | Technology |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes + Supabase (Auth + PostgreSQL) |
| Crawler | Python 3.11 + Requests + BeautifulSoup |
| Scheduler | GitHub Actions (every 30 min) |
| Deployment | Vercel (frontend) + GitHub Actions (crawler) |

### Project Structure

```
├── web/                    # Next.js frontend
│   ├── src/app/            # Pages and API routes
│   │   ├── api/configs/    # Monitor config CRUD API
│   │   ├── api/go/         # Short link click tracking
│   │   ├── dashboard/      # Monitor config management
│   │   ├── login/          # Phone OTP login
│   │   └── records/        # Notification history
│   ├── src/components/     # Shared components
│   └── src/lib/            # Supabase client and types
├── crawler/                # Python crawler
│   ├── scrapers/           # Platform scrapers (Zhubajie, Proginn)
│   ├── notifiers/          # Notification senders (Feishu, WeChat)
│   ├── main.py             # Crawler entry point
│   └── db.py               # Database operations
├── supabase/               # Database migrations
└── .github/workflows/      # GitHub Actions scheduler
```

### Getting Started

#### 1. Set up Supabase

- Create a [Supabase](https://supabase.com) project
- Run `supabase/migrations/001_initial_schema.sql` and `002_add_referral.sql` in the SQL Editor

#### 2. Start the frontend

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and keys
npm install
npm run dev
```

Visit http://localhost:3000

#### 3. Run the crawler (local testing)

```bash
cd crawler
pip install -r requirements.txt
export SUPABASE_URL=your-supabase-url
export SUPABASE_SERVICE_KEY=your-service-key
python main.py
```

#### 4. Deploy

**Frontend → Vercel:**
- Import the `web/` directory to Vercel
- Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Crawler → GitHub Actions:**
- Add secrets in repo Settings → Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FEISHU_DEV_WEBHOOK`, `SITE_URL`
- The crawler runs automatically every 30 minutes, and can also be triggered manually

### License

MIT
