# 接单监控工具 MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个自动监控猪八戒和程序员客栈的接单工具 MVP，通过飞书/微信推送匹配职位，收集用户数据验证付费意愿。

**Architecture:** Next.js 全栈应用部署在 Vercel，Supabase 提供数据库和用户认证，Python 爬虫通过 GitHub Actions 定时运行，爬取结果写入 Supabase 后触发通知推送。

**Tech Stack:** Next.js 14 (App Router) + Tailwind CSS + Supabase (Auth + PostgreSQL) + Python 3.11 + GitHub Actions

**Design Doc:** `docs/plans/2026-03-16-job-monitor-mvp-design.md`

---

## Phase 1: 项目基础搭建

### Task 1: 初始化 Next.js 项目

**Files:**
- Create: `web/package.json`
- Create: `web/tailwind.config.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/.env.local.example`

**Step 1: 创建 Next.js 项目**

```bash
cd /Users/pangxubin/git/test_cy
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

**Step 2: 安装 Supabase 依赖**

```bash
cd web
pnpm add @supabase/supabase-js @supabase/ssr
```

**Step 3: 创建环境变量模板**

创建 `web/.env.local.example`：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 4: 验证项目启动**

```bash
cd web && pnpm dev
```
Expected: 在 http://localhost:3000 看到 Next.js 默认页面

**Step 5: Commit**

```bash
git add web/
git commit -m "feat: 初始化 Next.js + Tailwind 项目"
```

---

### Task 2: 配置 Supabase 客户端

**Files:**
- Create: `web/src/lib/supabase/client.ts`
- Create: `web/src/lib/supabase/server.ts`
- Create: `web/src/lib/supabase/middleware.ts`
- Create: `web/src/middleware.ts`
- Create: `web/src/lib/database.types.ts`

**Step 1: 创建浏览器端 Supabase 客户端**

```typescript
// web/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: 创建服务端 Supabase 客户端**

```typescript
// web/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 中无法设置 cookie，忽略
          }
        },
      },
    }
  )
}
```

**Step 3: 创建 middleware 用于刷新 session**

```typescript
// web/src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 未登录用户访问受保护页面时重定向到登录页
  const protectedPaths = ['/dashboard', '/records']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

```typescript
// web/src/middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/go/).*)',
  ],
}
```

**Step 4: 创建数据库类型占位文件**

```typescript
// web/src/lib/database.types.ts
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          wechat_id: string | null
          created_at: string
          last_active_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          wechat_id?: string | null
          created_at?: string
          last_active_at?: string
        }
        Update: {
          phone?: string | null
          wechat_id?: string | null
          last_active_at?: string
        }
      }
      monitor_configs: {
        Row: {
          id: string
          user_id: string
          platform: 'zhubajie' | 'proginn'
          keywords: string[]
          min_budget: number | null
          notify_channel: 'feishu' | 'wechat'
          notify_target: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'zhubajie' | 'proginn'
          keywords: string[]
          min_budget?: number | null
          notify_channel: 'feishu' | 'wechat'
          notify_target: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          platform?: 'zhubajie' | 'proginn'
          keywords?: string[]
          min_budget?: number | null
          notify_channel?: 'feishu' | 'wechat'
          notify_target?: string
          is_active?: boolean
        }
      }
      jobs: {
        Row: {
          id: string
          platform: 'zhubajie' | 'proginn'
          external_id: string
          title: string
          description: string | null
          budget: number | null
          url: string
          posted_at: string | null
          crawled_at: string
        }
        Insert: {
          id?: string
          platform: 'zhubajie' | 'proginn'
          external_id: string
          title: string
          description?: string | null
          budget?: number | null
          url: string
          posted_at?: string | null
          crawled_at?: string
        }
        Update: never
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          channel: 'feishu' | 'wechat'
          status: 'sent' | 'failed'
          clicked: boolean
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          channel: 'feishu' | 'wechat'
          status: 'sent' | 'failed'
          clicked?: boolean
          sent_at?: string
        }
        Update: {
          clicked?: boolean
        }
      }
    }
    Enums: {
      platform_type: 'zhubajie' | 'proginn'
      notify_channel_type: 'feishu' | 'wechat'
      notification_status: 'sent' | 'failed'
    }
  }
}
```

**Step 5: Commit**

```bash
git add web/src/lib/ web/src/middleware.ts
git commit -m "feat: 配置 Supabase 客户端和 Auth middleware"
```

---

### Task 3: Supabase 数据库 Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: 创建迁移文件**

```sql
-- supabase/migrations/001_initial_schema.sql

-- 枚举类型
create type platform_type as enum ('zhubajie', 'proginn');
create type notify_channel_type as enum ('feishu', 'wechat');
create type notification_status as enum ('sent', 'failed');

-- 用户扩展表
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text,
  wechat_id text,
  created_at timestamptz default now() not null,
  last_active_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "用户只能查看自己的 profile"
  on profiles for select using (auth.uid() = id);

create policy "用户只能更新自己的 profile"
  on profiles for update using (auth.uid() = id);

create policy "用户可以插入自己的 profile"
  on profiles for insert with check (auth.uid() = id);

-- 自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 监控配置表
create table monitor_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  platform platform_type not null,
  keywords text[] not null,
  min_budget integer,
  notify_channel notify_channel_type not null,
  notify_target text not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table monitor_configs enable row level security;

create policy "用户只能查看自己的配置"
  on monitor_configs for select using (auth.uid() = user_id);

create policy "用户只能创建自己的配置"
  on monitor_configs for insert with check (auth.uid() = user_id);

create policy "用户只能更新自己的配置"
  on monitor_configs for update using (auth.uid() = user_id);

create policy "用户只能删除自己的配置"
  on monitor_configs for delete using (auth.uid() = user_id);

-- 限制每个用户最多 3 个配置
create or replace function check_config_limit()
returns trigger as $$
begin
  if (select count(*) from monitor_configs where user_id = new.user_id) >= 3 then
    raise exception '每个用户最多 3 个监控配置';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_config_limit
  before insert on monitor_configs
  for each row execute procedure check_config_limit();

-- 职位表
create table jobs (
  id uuid default gen_random_uuid() primary key,
  platform platform_type not null,
  external_id text not null,
  title text not null,
  description text,
  budget integer,
  url text not null,
  posted_at timestamptz,
  crawled_at timestamptz default now() not null,
  unique(platform, external_id)
);

-- 爬虫使用 service_role key 写入，无需 RLS
alter table jobs enable row level security;

create policy "所有登录用户可查看职位"
  on jobs for select using (auth.role() = 'authenticated');

-- 推送记录表
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  channel notify_channel_type not null,
  status notification_status not null,
  clicked boolean default false not null,
  sent_at timestamptz default now() not null
);

alter table notifications enable row level security;

create policy "用户只能查看自己的推送记录"
  on notifications for select using (auth.uid() = user_id);

-- 索引
create index idx_jobs_platform_external on jobs(platform, external_id);
create index idx_jobs_crawled_at on jobs(crawled_at desc);
create index idx_monitor_configs_active on monitor_configs(is_active) where is_active = true;
create index idx_notifications_user_sent on notifications(user_id, sent_at desc);
```

**Step 2: 在 Supabase Dashboard 中执行迁移**

登录 Supabase Dashboard → SQL Editor → 粘贴并执行上述 SQL。

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: 创建数据库 schema（profiles, monitor_configs, jobs, notifications）"
```

---

## Phase 2: 用户认证

### Task 4: 登录页面 UI

**Files:**
- Create: `web/src/app/login/page.tsx`
- Create: `web/src/app/login/actions.ts`

**Step 1: 创建登录 Server Action**

```typescript
// web/src/app/login/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function sendOtp(formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { error: '请输入有效的手机号' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
  })

  if (error) {
    return { error: '发送验证码失败，请稍后重试' }
  }

  return { success: true }
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const token = formData.get('token') as string

  if (!token || token.length !== 6) {
    return { error: '请输入 6 位验证码' }
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    return { error: '验证码错误或已过期' }
  }

  redirect('/dashboard')
}
```

**Step 2: 创建登录页面**

```tsx
// web/src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { sendOtp, verifyOtp } from './actions'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp() {
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.set('phone', phone)
    const result = await sendOtp(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep('verify')
    }
  }

  async function handleVerify(formData: FormData) {
    setLoading(true)
    setError('')
    formData.set('phone', phone)
    const result = await verifyOtp(formData)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-2">接单监控</h1>
        <p className="text-gray-500 text-center mb-8">
          自动监控平台需求，第一时间通知你
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              maxLength={11}
            />
            <button
              onClick={handleSendOtp}
              disabled={loading || phone.length !== 11}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <form action={handleVerify} className="space-y-4">
            <p className="text-sm text-gray-600">验证码已发送至 {phone}</p>
            <input
              type="text"
              name="token"
              placeholder="请输入 6 位验证码"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              maxLength={6}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              更换手机号
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

**Step 3: 验证页面渲染**

```bash
cd web && pnpm dev
```
Expected: 访问 http://localhost:3000/login 看到手机号输入页面

**Step 4: Commit**

```bash
git add web/src/app/login/
git commit -m "feat: 实现手机号验证码登录页面"
```

---

### Task 5: 登出与导航栏

**Files:**
- Create: `web/src/components/navbar.tsx`
- Modify: `web/src/app/layout.tsx`
- Create: `web/src/app/auth/signout/route.ts`

**Step 1: 创建登出 API Route**

```typescript
// web/src/app/auth/signout/route.ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

**Step 2: 创建导航栏组件**

```tsx
// web/src/components/navbar.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            接单监控
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            我的监控
          </Link>
          <Link
            href="/records"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            推送记录
          </Link>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            退出
          </button>
        </form>
      </div>
    </nav>
  )
}
```

**Step 3: 更新 layout.tsx 添加导航栏**

在 `web/src/app/layout.tsx` 的 `<body>` 中添加 `<Navbar />`。

**Step 4: Commit**

```bash
git add web/src/components/ web/src/app/auth/ web/src/app/layout.tsx
git commit -m "feat: 添加导航栏和登出功能"
```

---

## Phase 3: 监控配置 CRUD

### Task 6: 监控配置 API

**Files:**
- Create: `web/src/app/api/configs/route.ts`
- Create: `web/src/app/api/configs/[id]/route.ts`

**Step 1: 创建列表 + 新增 API**

```typescript
// web/src/app/api/configs/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createConfigSchema = z.object({
  platform: z.enum(['zhubajie', 'proginn']),
  keywords: z.array(z.string().min(1)).min(1).max(10),
  min_budget: z.number().int().min(0).nullable().optional(),
  notify_channel: z.enum(['feishu', 'wechat']),
  notify_target: z.string().min(1),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('monitor_configs')
    .select('*, notifications(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createConfigSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '参数错误', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('monitor_configs')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    if (error.message.includes('最多 3 个')) {
      return NextResponse.json({ error: '最多 3 个监控配置' }, { status: 400 })
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

**Step 2: 创建更新 + 删除 API**

```typescript
// web/src/app/api/configs/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateConfigSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(10).optional(),
  min_budget: z.number().int().min(0).nullable().optional(),
  notify_channel: z.enum(['feishu', 'wechat']).optional(),
  notify_target: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateConfigSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('monitor_configs')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { error } = await supabase
    .from('monitor_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 3: 安装 zod**

```bash
cd web && pnpm add zod
```

**Step 4: Commit**

```bash
git add web/src/app/api/configs/
git commit -m "feat: 实现监控配置 CRUD API"
```

---

### Task 7: 监控配置页面（Dashboard）

**Files:**
- Create: `web/src/app/dashboard/page.tsx`
- Create: `web/src/app/dashboard/config-card.tsx`
- Create: `web/src/app/dashboard/config-form.tsx`

**Step 1: 创建配置卡片组件**

```tsx
// web/src/app/dashboard/config-card.tsx
'use client'

import { useState } from 'react'
import type { Database } from '@/lib/database.types'

type Config = Database['public']['Tables']['monitor_configs']['Row']

const platformNames: Record<string, string> = {
  zhubajie: '猪八戒',
  proginn: '程序员客栈',
}

const channelNames: Record<string, string> = {
  feishu: '飞书',
  wechat: '微信',
}

export function ConfigCard({
  config,
  notificationCount,
  onToggle,
  onDelete,
}: {
  config: Config
  notificationCount: number
  onToggle: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await onToggle(config.id, !config.is_active)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('确定删除此监控配置？')) return
    setLoading(true)
    await onDelete(config.id)
    setLoading(false)
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium">{platformNames[config.platform]}</span>
        </div>
        <span className="text-sm text-gray-500">
          {channelNames[config.notify_channel]}通知 · 已推送 {notificationCount} 条
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {config.keywords.map((kw) => (
          <span key={kw} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-sm rounded">
            {kw}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {config.is_active ? '暂停' : '启用'}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm text-red-500 hover:text-red-700"
        >
          删除
        </button>
      </div>
    </div>
  )
}
```

**Step 2: 创建配置表单组件**

```tsx
// web/src/app/dashboard/config-form.tsx
'use client'

import { useState } from 'react'

export function ConfigForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    platform: string
    keywords: string[]
    notify_channel: string
    notify_target: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const [platform, setPlatform] = useState('zhubajie')
  const [keywordsText, setKeywordsText] = useState('')
  const [notifyChannel, setNotifyChannel] = useState('feishu')
  const [notifyTarget, setNotifyTarget] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const keywords = keywordsText.split(/[,，\s]+/).filter(Boolean)
    await onSubmit({ platform, keywords, notify_channel: notifyChannel, notify_target: notifyTarget })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-white space-y-4">
      <h3 className="font-medium">新增监控</h3>

      <div>
        <label className="block text-sm text-gray-600 mb-1">平台</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="zhubajie">猪八戒</option>
          <option value="proginn">程序员客栈</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">
          关键词（用逗号或空格分隔）
        </label>
        <input
          type="text"
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="Python, React, 小程序"
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">通知渠道</label>
        <select
          value={notifyChannel}
          onChange={(e) => setNotifyChannel(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="feishu">飞书 Webhook</option>
          <option value="wechat">微信（Server 酱）</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">
          {notifyChannel === 'feishu' ? 'Webhook URL' : 'Server 酱 SendKey'}
        </label>
        <input
          type="text"
          value={notifyTarget}
          onChange={(e) => setNotifyTarget(e.target.value)}
          placeholder={notifyChannel === 'feishu' ? 'https://open.feishu.cn/open-apis/bot/v2/hook/...' : 'SCT...'}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          取消
        </button>
      </div>
    </form>
  )
}
```

**Step 3: 创建 Dashboard 主页面**

```tsx
// web/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { ConfigCard } from './config-card'
import { ConfigForm } from './config-form'

interface ConfigWithCount {
  id: string
  user_id: string
  platform: 'zhubajie' | 'proginn'
  keywords: string[]
  min_budget: number | null
  notify_channel: 'feishu' | 'wechat'
  notify_target: string
  is_active: boolean
  created_at: string
  notifications: [{ count: number }]
}

export default function DashboardPage() {
  const [configs, setConfigs] = useState<ConfigWithCount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchConfigs = useCallback(async () => {
    const res = await fetch('/api/configs')
    const json = await res.json()
    setConfigs(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  async function handleCreate(data: {
    platform: string
    keywords: string[]
    notify_channel: string
    notify_target: string
  }) {
    const res = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      setShowForm(false)
      await fetchConfigs()
    } else {
      const json = await res.json()
      alert(json.error)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    await fetchConfigs()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/configs/${id}`, { method: 'DELETE' })
    await fetchConfigs()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">我的监控</h1>
        {configs.length < 3 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + 新增
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <ConfigForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {configs.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">还没有监控配置</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建第一个监控
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              notificationCount={config.notifications?.[0]?.count ?? 0}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add web/src/app/dashboard/ web/src/app/dashboard/
git commit -m "feat: 实现监控配置 Dashboard 页面"
```

---

## Phase 4: 推送记录与短链接

### Task 8: 短链接追踪 API

**Files:**
- Create: `web/src/app/api/go/[id]/route.ts`

**Step 1: 创建短链接重定向 API**

```typescript
// web/src/app/api/go/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// 使用 service role 绕过 RLS，因为这里不需要用户登录
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 更新点击状态
  const { data: notification } = await supabase
    .from('notifications')
    .update({ clicked: true })
    .eq('id', id)
    .select('job_id')
    .single()

  if (!notification) {
    redirect('/')
  }

  // 获取原始链接
  const { data: job } = await supabase
    .from('jobs')
    .select('url')
    .eq('id', notification.job_id)
    .single()

  redirect(job?.url ?? '/')
}
```

**Step 2: 在 .env.local.example 中添加 service role key**

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 3: Commit**

```bash
git add web/src/app/api/go/
git commit -m "feat: 实现短链接点击追踪"
```

---

### Task 9: 推送记录页面

**Files:**
- Create: `web/src/app/records/page.tsx`

**Step 1: 创建推送记录页面**

```tsx
// web/src/app/records/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function RecordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, jobs(*)')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  const platformNames: Record<string, string> = {
    zhubajie: '猪八戒',
    proginn: '程序员客栈',
  }

  // 按日期分组
  const grouped: Record<string, typeof notifications> = {}
  for (const n of notifications ?? []) {
    const date = new Date(n.sent_at).toLocaleDateString('zh-CN')
    if (!grouped[date]) grouped[date] = []
    grouped[date]!.push(n)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">推送记录</h1>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center py-12 text-gray-500">暂无推送记录</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm text-gray-500 mb-2">{date}</h2>
              <div className="space-y-2">
                {items!.map((n) => (
                  <div key={n.id} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {(n as any).jobs?.title ?? '未知职位'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {platformNames[(n as any).jobs?.platform] ?? ''}
                      </span>
                    </div>
                    {(n as any).jobs?.budget && (
                      <p className="text-sm text-green-600 mt-1">
                        预算: ¥{(n as any).jobs.budget.toLocaleString()}
                      </p>
                    )}
                    <a
                      href={`/api/go/${n.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                      查看详情
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/app/records/
git commit -m "feat: 实现推送记录页面"
```

---

## Phase 5: Python 爬虫

### Task 10: 爬虫项目初始化

**Files:**
- Create: `crawler/requirements.txt`
- Create: `crawler/config.py`
- Create: `crawler/db.py`

**Step 1: 创建 requirements.txt**

```txt
requests==2.31.0
beautifulsoup4==4.12.3
supabase==2.4.0
python-dotenv==1.0.1
```

**Step 2: 创建配置文件**

```python
# crawler/config.py
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
FEISHU_DEV_WEBHOOK = os.environ.get("FEISHU_DEV_WEBHOOK", "")

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
```

**Step 3: 创建数据库操作模块**

```python
# crawler/db.py
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def insert_jobs(jobs: list[dict]) -> list[dict]:
    """插入新职位，返回成功插入的职位列表（去重由 unique 约束处理）"""
    new_jobs = []
    for job in jobs:
        result = supabase.table("jobs").upsert(
            job, on_conflict="platform,external_id", ignore_duplicates=True
        ).execute()
        if result.data:
            new_jobs.append(result.data[0])
    return new_jobs


def get_active_configs() -> list[dict]:
    """获取所有启用的监控配置"""
    result = supabase.table("monitor_configs").select("*").eq("is_active", True).execute()
    return result.data


def save_notification(user_id: str, job_id: str, channel: str, status: str) -> dict:
    """保存推送记录"""
    result = supabase.table("notifications").insert({
        "user_id": user_id,
        "job_id": job_id,
        "channel": channel,
        "status": status,
    }).execute()
    return result.data[0] if result.data else {}
```

**Step 4: Commit**

```bash
git add crawler/
git commit -m "feat: 初始化爬虫项目结构"
```

---

### Task 11: 猪八戒爬虫

**Files:**
- Create: `crawler/scrapers/zhubajie.py`
- Create: `crawler/scrapers/__init__.py`

**Step 1: 创建猪八戒爬虫**

```python
# crawler/scrapers/__init__.py
from .zhubajie import ZhubajieScraper
from .proginn import ProginnScraper

__all__ = ["ZhubajieScraper", "ProginnScraper"]
```

```python
# crawler/scrapers/zhubajie.py
import random
import time
import requests
from bs4 import BeautifulSoup
from config import USER_AGENTS


class ZhubajieScraper:
    BASE_URL = "https://task.zbj.com/t/ppsj/p{}o0.html"
    PLATFORM = "zhubajie"

    def fetch(self, pages: int = 2) -> list[dict]:
        jobs = []
        for page in range(1, pages + 1):
            try:
                url = self.BASE_URL.format(page)
                headers = {"User-Agent": random.choice(USER_AGENTS)}
                resp = requests.get(url, headers=headers, timeout=15)
                resp.raise_for_status()
                jobs.extend(self._parse(resp.text))
                time.sleep(random.uniform(3, 5))
            except Exception as e:
                print(f"[zhubajie] 第 {page} 页抓取失败: {e}")
        return jobs

    def _parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        items = []
        for task in soup.select(".new-taskdetail-container .task-item"):
            try:
                title_el = task.select_one(".task-title-text a")
                price_el = task.select_one(".task-price span")
                if not title_el:
                    continue

                href = title_el.get("href", "")
                external_id = href.strip("/").split("/")[-1] if href else ""

                budget = None
                if price_el:
                    price_text = price_el.get_text(strip=True).replace("¥", "").replace(",", "")
                    try:
                        budget = int(float(price_text))
                    except ValueError:
                        pass

                items.append({
                    "platform": self.PLATFORM,
                    "external_id": external_id,
                    "title": title_el.get_text(strip=True),
                    "description": None,
                    "budget": budget,
                    "url": href if href.startswith("http") else f"https://task.zbj.com{href}",
                })
            except Exception as e:
                print(f"[zhubajie] 解析条目失败: {e}")
        return items
```

> 注意：猪八戒页面结构可能随时变化，上线后需根据实际 HTML 调整选择器。

**Step 2: Commit**

```bash
git add crawler/scrapers/
git commit -m "feat: 实现猪八戒爬虫"
```

---

### Task 12: 程序员客栈爬虫

**Files:**
- Create: `crawler/scrapers/proginn.py`

**Step 1: 创建程序员客栈爬虫**

```python
# crawler/scrapers/proginn.py
import random
import time
import requests
from config import USER_AGENTS


class ProginnScraper:
    API_URL = "https://www.proginn.com/api/v2/projects"
    PLATFORM = "proginn"

    def fetch(self, pages: int = 2) -> list[dict]:
        jobs = []
        for page in range(1, pages + 1):
            try:
                headers = {
                    "User-Agent": random.choice(USER_AGENTS),
                    "Referer": "https://www.proginn.com/outsourcing",
                }
                resp = requests.get(
                    self.API_URL,
                    params={"page": page, "per_page": 20},
                    headers=headers,
                    timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()
                jobs.extend(self._parse(data))
                time.sleep(random.uniform(3, 5))
            except Exception as e:
                print(f"[proginn] 第 {page} 页抓取失败: {e}")
        return jobs

    def _parse(self, data: dict) -> list[dict]:
        items = []
        projects = data.get("data", {}).get("items", [])
        for p in projects:
            try:
                external_id = str(p.get("id", ""))
                if not external_id:
                    continue

                budget = None
                if p.get("budget"):
                    try:
                        budget = int(float(str(p["budget"]).replace(",", "")))
                    except ValueError:
                        pass

                items.append({
                    "platform": self.PLATFORM,
                    "external_id": external_id,
                    "title": p.get("title", ""),
                    "description": p.get("description", ""),
                    "budget": budget,
                    "url": f"https://www.proginn.com/outsourcing/{external_id}",
                })
            except Exception as e:
                print(f"[proginn] 解析条目失败: {e}")
        return items
```

> 注意：程序员客栈 API 可能需要认证或变更，上线后根据实际情况调整。

**Step 2: Commit**

```bash
git add crawler/scrapers/proginn.py
git commit -m "feat: 实现程序员客栈爬虫"
```

---

### Task 13: 通知推送模块

**Files:**
- Create: `crawler/notifiers/__init__.py`
- Create: `crawler/notifiers/feishu.py`
- Create: `crawler/notifiers/wechat.py`

**Step 1: 创建飞书通知**

```python
# crawler/notifiers/__init__.py
from .feishu import send_feishu
from .wechat import send_wechat

__all__ = ["send_feishu", "send_wechat"]
```

```python
# crawler/notifiers/feishu.py
import requests

SITE_URL = "https://your-domain.vercel.app"  # 部署后替换


def send_feishu(
    webhook_url: str,
    job: dict,
    matched_keywords: list[str],
    notification_id: str,
) -> bool:
    short_link = f"{SITE_URL}/api/go/{notification_id}"
    budget_text = f"¥{job['budget']:,}" if job.get("budget") else "面议"

    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": "新需求匹配！"},
                "template": "blue",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": (
                            f"**{job['title']}**\n"
                            f"平台：{job['platform']}\n"
                            f"预算：{budget_text}\n"
                            f"命中关键词：{', '.join(matched_keywords)}"
                        ),
                    },
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {"tag": "plain_text", "content": "查看详情"},
                            "url": short_link,
                            "type": "primary",
                        }
                    ],
                },
            ],
        },
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[feishu] 发送失败: {e}")
        return False
```

**Step 2: 创建微信（Server 酱）通知**

```python
# crawler/notifiers/wechat.py
import requests

SITE_URL = "https://your-domain.vercel.app"  # 部署后替换


def send_wechat(
    send_key: str,
    job: dict,
    matched_keywords: list[str],
    notification_id: str,
) -> bool:
    short_link = f"{SITE_URL}/api/go/{notification_id}"
    budget_text = f"¥{job['budget']:,}" if job.get("budget") else "面议"
    platform_names = {"zhubajie": "猪八戒", "proginn": "程序员客栈"}

    title = f"新需求匹配 - {job['title'][:30]}"
    content = (
        f"**{job['title']}**\n\n"
        f"- 平台：{platform_names.get(job['platform'], job['platform'])}\n"
        f"- 预算：{budget_text}\n"
        f"- 命中关键词：{', '.join(matched_keywords)}\n\n"
        f"[查看详情]({short_link})"
    )

    try:
        resp = requests.post(
            f"https://sctapi.ftqq.com/{send_key}.send",
            data={"title": title, "desp": content},
            timeout=10,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[wechat] 发送失败: {e}")
        return False
```

**Step 3: Commit**

```bash
git add crawler/notifiers/
git commit -m "feat: 实现飞书和微信通知推送"
```

---

### Task 14: 爬虫主入口

**Files:**
- Create: `crawler/main.py`

**Step 1: 创建主入口**

```python
# crawler/main.py
import sys
from scrapers import ZhubajieScraper, ProginnScraper
from notifiers import send_feishu, send_wechat
from db import insert_jobs, get_active_configs, save_notification
from config import FEISHU_DEV_WEBHOOK


def match_keywords(job: dict, keywords: list[str]) -> list[str]:
    """返回匹配到的关键词列表"""
    text = f"{job.get('title', '')} {job.get('description', '')}".lower()
    return [kw for kw in keywords if kw.lower() in text]


def notify(config: dict, job: dict, matched_keywords: list[str], job_id: str) -> bool:
    """发送通知并记录"""
    notification = save_notification(
        user_id=config["user_id"],
        job_id=job_id,
        channel=config["notify_channel"],
        status="sent",
    )
    notification_id = notification.get("id", "")

    if config["notify_channel"] == "feishu":
        success = send_feishu(config["notify_target"], job, matched_keywords, notification_id)
    else:
        success = send_wechat(config["notify_target"], job, matched_keywords, notification_id)

    if not success:
        # 更新状态为失败
        from db import supabase
        supabase.table("notifications").update({"status": "failed"}).eq("id", notification_id).execute()

    return success


def run():
    print("=== 开始抓取 ===")

    # 1. 抓取职位
    scrapers = [ZhubajieScraper(), ProginnScraper()]
    all_jobs = []
    for scraper in scrapers:
        jobs = scraper.fetch(pages=2)
        print(f"[{scraper.PLATFORM}] 抓取到 {len(jobs)} 条")
        all_jobs.extend(jobs)

    # 2. 去重入库
    new_jobs = insert_jobs(all_jobs)
    print(f"新增 {len(new_jobs)} 条职位")

    if not new_jobs:
        print("无新职位，结束")
        return

    # 3. 匹配并推送
    configs = get_active_configs()
    print(f"活跃配置 {len(configs)} 个")

    sent_count = 0
    fail_count = 0

    for config in configs:
        for job in new_jobs:
            if job["platform"] != config["platform"]:
                continue

            matched = match_keywords(job, config["keywords"])
            if not matched:
                continue

            if config.get("min_budget") and (job.get("budget") or 0) < config["min_budget"]:
                continue

            success = notify(config, job, matched, job["id"])
            if success:
                sent_count += 1
            else:
                fail_count += 1

    print(f"=== 完成：推送 {sent_count} 条，失败 {fail_count} 条 ===")

    # 4. 连续失败告警（给开发者）
    if fail_count > 0 and FEISHU_DEV_WEBHOOK:
        import requests
        requests.post(FEISHU_DEV_WEBHOOK, json={
            "msg_type": "text",
            "content": {"text": f"[告警] 本次推送失败 {fail_count} 条，请检查"},
        }, timeout=10)


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"致命错误: {e}", file=sys.stderr)
        sys.exit(1)
```

**Step 2: 本地测试**

```bash
cd crawler
pip install -r requirements.txt
python main.py
```
Expected: 看到抓取日志输出

**Step 3: Commit**

```bash
git add crawler/main.py
git commit -m "feat: 实现爬虫主入口（抓取 → 去重 → 匹配 → 推送）"
```

---

## Phase 6: 部署与定时任务

### Task 15: GitHub Actions 定时爬虫

**Files:**
- Create: `.github/workflows/crawl.yml`

**Step 1: 创建 workflow**

```yaml
# .github/workflows/crawl.yml
name: Job Crawler

on:
  schedule:
    - cron: '*/30 * * * *'  # 每 30 分钟
  workflow_dispatch:          # 手动触发

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r crawler/requirements.txt

      - name: Run crawler
        working-directory: crawler
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          FEISHU_DEV_WEBHOOK: ${{ secrets.FEISHU_DEV_WEBHOOK }}
        run: python main.py
```

**Step 2: 配置 GitHub Secrets**

在 GitHub 仓库 Settings → Secrets 中添加：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `FEISHU_DEV_WEBHOOK`（开发者告警 webhook）

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: 添加 GitHub Actions 定时爬虫（每 30 分钟）"
```

---

### Task 16: Vercel 部署配置

**Files:**
- Create: `web/vercel.json`
- Modify: `web/.gitignore`

**Step 1: 创建 Vercel 配置**

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
```

**Step 2: 部署到 Vercel**

```bash
cd web
npx vercel --prod
```

在 Vercel Dashboard 中配置环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Commit**

```bash
git add web/vercel.json
git commit -m "chore: 添加 Vercel 部署配置"
```

---

### Task 17: 邀请裂变（ref 追踪）

**Files:**
- Modify: `web/src/app/login/page.tsx`
- Modify: `supabase/migrations/001_initial_schema.sql`

**Step 1: 在 profiles 表添加 referred_by 字段**

```sql
-- supabase/migrations/002_add_referral.sql
alter table profiles add column referred_by uuid references profiles(id);
create index idx_profiles_referred_by on profiles(referred_by);
```

**Step 2: 登录页读取 ref 参数**

在登录页的 URL 中读取 `?ref=USER_ID`，注册成功后写入 `profiles.referred_by`。

**Step 3: Commit**

```bash
git add supabase/ web/src/app/login/
git commit -m "feat: 添加邀请裂变 ref 追踪"
```

---

## Phase 7: 首页落地页

### Task 18: 营销落地页

**Files:**
- Modify: `web/src/app/page.tsx`

**Step 1: 创建简单落地页**

首页展示：
- 一句话介绍："自动监控猪八戒、程序员客栈，新需求第一时间通知你"
- 3 个卖点：多平台监控 / 关键词精准匹配 / 飞书微信实时推送
- CTA 按钮："免费开始使用" → 跳转到 /login

保持极简，一屏搞定，利于 SEO。

**Step 2: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: 创建营销落地页"
```

---

## 总结

| Phase | Tasks | 预估工作量 |
|-------|-------|-----------|
| Phase 1: 基础搭建 | Task 1-3 | 1 天 |
| Phase 2: 用户认证 | Task 4-5 | 0.5 天 |
| Phase 3: 监控配置 | Task 6-7 | 1 天 |
| Phase 4: 记录与短链 | Task 8-9 | 0.5 天 |
| Phase 5: Python 爬虫 | Task 10-14 | 2 天 |
| Phase 6: 部署 | Task 15-17 | 0.5 天 |
| Phase 7: 落地页 | Task 18 | 0.5 天 |
| **总计** | **18 Tasks** | **~6 天** |

**依赖关系：**
- Phase 2-4 依赖 Phase 1
- Phase 5 可与 Phase 2-4 并行开发
- Phase 6 依赖所有前置 Phase
- Phase 7 可随时完成
