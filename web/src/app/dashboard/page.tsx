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
