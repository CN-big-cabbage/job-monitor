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
