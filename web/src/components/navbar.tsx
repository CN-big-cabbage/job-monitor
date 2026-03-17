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
