# 接单监控工具 MVP 设计文档

> 定位：快速验证 MVP，最低成本跑通核心链路，验证付费意愿

## 一、产品定位

自动监控国内自由职业平台，有新需求时第一时间通知用户。

- 目标用户：兼职程序员、全职接单者
- 核心痛点：手动刷平台浪费时间，错过高价值订单
- MVP 策略：先免费开放，收集用户数据，验证付费意愿后再收费

## 二、整体架构

```
用户 → Web 前端 (Vercel) → API 后端 (Vercel Serverless)
                                    ↓
                              Supabase (PostgreSQL)
                                    ↓
                         定时爬虫 (GitHub Actions, 每30分钟)
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
              猪八戒 Scraper                  程序员客栈 Scraper
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                          去重 + 关键词匹配
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
              飞书 Webhook                  微信 (Server酱)
```

### 技术选型

| 层级 | 选型 | 理由 |
|------|------|------|
| 前端 | Next.js + Tailwind | Vercel 免费部署，SSR 利于 SEO |
| 后端 | Next.js API Routes | 不需要额外服务器 |
| 数据库 | Supabase (PostgreSQL) | 免费额度足够 MVP，自带用户认证 |
| 爬虫 | Python + GitHub Actions | 免费定时任务，每月 2000 分钟够用 |
| 通知 | 飞书 Webhook + Server酱 | 零成本 |

### 关键决策

- 用 Supabase Auth 做用户认证，省去自建登录系统
- 爬虫和 Web 分离部署，爬虫挂了不影响用户访问
- GitHub Actions 定时触发爬虫，免费且稳定

## 三、数据模型

```sql
-- 用户扩展表 (Supabase Auth 自带 auth.users，额外扩展)
profiles
├── id (uuid, 关联 auth.users)
├── phone (手机号)
├── wechat_id (微信号，选填)
├── created_at
└── last_active_at

-- 监控配置表
monitor_configs
├── id (uuid)
├── user_id (关联 profiles)
├── platform (enum: zhubajie, proginn)
├── keywords (text[])
├── min_budget (integer, 选填)
├── notify_channel (enum: feishu, wechat)
├── notify_target (webhook URL 或 Server酱 key)
├── is_active (boolean)
└── created_at

-- 职位表 (爬虫写入)
jobs
├── id (uuid)
├── platform (enum)
├── external_id (平台原始ID，去重用)
├── title
├── description
├── budget (integer, 可为空)
├── url (原始链接)
├── posted_at
└── crawled_at

-- 推送记录表
notifications
├── id (uuid)
├── user_id
├── job_id
├── channel (feishu / wechat)
├── status (sent / failed)
├── clicked (boolean, 短链接追踪)
└── sent_at
```

### 数据收集策略

| 指标 | 来源 | 用途 |
|------|------|------|
| 注册量 | profiles | 需求是否存在 |
| 关键词配置数 | monitor_configs | 用户投入程度 |
| 推送点击率 | notifications.clicked | 推送价值感知 |
| 最后活跃时间 | profiles.last_active_at | 留存率 |
| 日活/周活 | API 访问日志 | 粘性 |

## 四、核心页面

### 页面 1：注册/登录

- 手机号 + 短信验证码登录（Supabase Auth）
- 登录后可选填微信号
- 极简，无多余字段

### 页面 2：监控配置（登录后首页）

- 展示用户的监控配置列表（平台、关键词、通知渠道、已推送数量）
- 支持新增/编辑/暂停监控
- MVP 限制：每人最多 3 个监控配置

### 页面 3：推送记录

- 按日期分组展示最近 50 条推送
- 显示标题、平台、预算
- 点击"查看详情"走短链接跳转，记录点击行为

### 用户流程

```
注册(手机号) → 创建第一个监控 → 等待推送 → 查看记录/点击链接
     ↓                                        ↓
  收集手机号                              收集点击率/活跃度
```

### MVP 不做的

- 价格筛选
- 会员体系
- 历史搜索
- 多用户/团队
- API 接口

## 五、爬虫与推送

### 爬虫设计

- 每 30 分钟执行一次（GitHub Actions cron）
- 猪八戒：抓取最新需求列表页
- 程序员客栈：抓取最新项目列表
- 每次只抓最近 2 页，避免触发反爬

### 去重逻辑

- `platform + external_id` 作为唯一键
- 已存在的职位跳过

### 关键词匹配

- 遍历所有 `is_active = true` 的 monitor_configs
- 标题或描述包含用户任一关键词即命中
- 大小写不敏感，中文包含匹配

### 推送格式

飞书：标题 + 平台 + 预算 + 命中关键词 + 短链接
微信（Server酱）：同上，适配 Server 酱格式

### 反爬策略

| 措施 | 实现 |
|------|------|
| 请求间隔 | 3-5 秒随机 |
| User-Agent | 随机轮换 |
| 频率控制 | 每 30 分钟一次 |
| 失败告警 | 连续 3 次失败通知开发者 |

### 短链接追踪

- Supabase 存储短链接映射
- 用户点击时记录 `notifications.clicked = true`
- 302 重定向到原始链接
- 通过 Next.js API Route `/api/go/[id]` 实现

## 六、变现路径

### 阶段 1：MVP（第 1-2 月）— 免费

验证 3 个假设：

| 假设 | 验证指标 | 达标线 |
|------|---------|--------|
| 有人需要 | 注册用户数 | > 50 人 |
| 推送有价值 | 推送点击率 | > 20% |
| 持续使用 | 周留存率 | > 30% |

### 阶段 2：付费验证（第 2-3 月）— 功能限制

免费版限制：1 个监控 + 每日汇总 + 10 条记录

触碰限制时弹出升级弹窗，底部附价格投票（¥19/¥29/¥39/其他），收集真实付费意愿数据。

### 阶段 3：正式收费（第 3-4 月）

| 等级 | 价格 | 功能 |
|------|------|------|
| 免费版 | ¥0 | 1 个监控 + 每日汇总 + 10 条记录 |
| 专业版 | 根据投票定价 | 全平台 + 实时推送 + 无限记录 |

### 成本

| 项目 | 月成本 |
|------|--------|
| Vercel | ¥0 |
| Supabase | ¥0 |
| GitHub Actions | ¥0 |
| 域名 | ¥30 |
| 短信验证码 | ~¥5 |
| **总计** | **~¥35/月** |

## 七、推广获客

### MVP 阶段（目标：前 50 用户）

| 渠道 | 做法 | 预期 |
|------|------|------|
| 掘金 | "我用 Python 做了个自动接单监控工具" | 500 阅读 → 20 注册 |
| V2EX | 发到"分享创造"节点 | 300 阅读 → 15 注册 |
| 知乎 | 回答"程序员如何接私活"类问题 | 1000 阅读 → 15 注册 |

### 用户裂变

推送消息底部附邀请链接，邀请 3 人注册解锁额外 2 个监控配置。注册时记录 ref 参数。

### MVP 不做

- 闲鱼卖工具
- B 站教程
- 付费投放
