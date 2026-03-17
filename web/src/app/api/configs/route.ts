import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'

type ConfigInsert = Database['public']['Tables']['monitor_configs']['Insert']

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
    .insert({ ...parsed.data, user_id: user.id } as ConfigInsert)
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
