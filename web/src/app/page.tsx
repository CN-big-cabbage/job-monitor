import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          自动监控猪八戒、程序员客栈
          <br />
          新需求第一时间通知你
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          告别手动刷平台，让好项目主动找上门
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">多平台监控</h3>
            <p className="text-sm text-gray-500">
              同时监控猪八戒、程序员客栈，一个工具覆盖主流接单平台
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">关键词精准匹配</h3>
            <p className="text-sm text-gray-500">
              自定义关键词和预算范围，只推送你关心的需求
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">飞书微信实时推送</h3>
            <p className="text-sm text-gray-500">
              每 30 分钟自动检测新需求，通过飞书或微信即时通知
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          免费开始使用
        </Link>

        <p className="mt-6 text-sm text-gray-400">
          无需付费，注册即可创建 3 个监控配置
        </p>
      </div>
    </div>
  )
}
