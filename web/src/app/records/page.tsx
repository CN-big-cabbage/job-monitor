import { createClient } from '@/lib/supabase/server'

interface NotificationWithJob {
  id: string
  user_id: string
  job_id: string
  channel: string
  status: string
  clicked: boolean
  sent_at: string
  jobs: {
    title: string
    platform: string
    budget: number | null
    url: string
  } | null
}

const platformNames: Record<string, string> = {
  zhubajie: '猪八戒',
  proginn: '程序员客栈',
}

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

  const items = (notifications ?? []) as unknown as NotificationWithJob[]

  // 按日期分组
  const grouped: Record<string, NotificationWithJob[]> = {}
  for (const n of items) {
    const date = new Date(n.sent_at).toLocaleDateString('zh-CN')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(n)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">推送记录</h1>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center py-12 text-gray-500">暂无推送记录</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <h2 className="text-sm text-gray-500 mb-2">{date}</h2>
              <div className="space-y-2">
                {dateItems.map((n) => (
                  <div key={n.id} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {n.jobs?.title ?? '未知职位'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {platformNames[n.jobs?.platform ?? ''] ?? ''}
                      </span>
                    </div>
                    {n.jobs?.budget && (
                      <p className="text-sm text-green-600 mt-1">
                        预算: ¥{n.jobs.budget.toLocaleString()}
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
