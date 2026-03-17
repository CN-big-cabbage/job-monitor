import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'

type ConfigUpdate = Database['public']['Tables']['monitor_configs']['Update']

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
    .update(parsed.data as ConfigUpdate)
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
