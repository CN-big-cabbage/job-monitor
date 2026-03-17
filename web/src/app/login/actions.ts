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
  const ref = formData.get('ref') as string | null

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

  // 写入邀请来源
  if (ref) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ referred_by: ref } as Record<string, string>)
        .eq('id', user.id)
    }
  }

  redirect('/dashboard')
}
