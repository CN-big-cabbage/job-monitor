import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getServiceClient()

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
