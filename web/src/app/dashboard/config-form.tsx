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
