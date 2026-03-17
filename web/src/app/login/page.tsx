'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { sendOtp, verifyOtp } from './actions'

function LoginForm() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp() {
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.set('phone', phone)
    const result = await sendOtp(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep('verify')
    }
  }

  async function handleVerify(formData: FormData) {
    setLoading(true)
    setError('')
    formData.set('phone', phone)
    if (ref) formData.set('ref', ref)
    const result = await verifyOtp(formData)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-2">接单监控</h1>
      <p className="text-gray-500 text-center mb-8">
        自动监控平台需求，第一时间通知你
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <div className="space-y-4">
          <input
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={11}
          />
          <button
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 11}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '发送中...' : '获取验证码'}
          </button>
        </div>
      ) : (
        <form action={handleVerify} className="space-y-4">
          <p className="text-sm text-gray-600">验证码已发送至 {phone}</p>
          <input
            type="text"
            name="token"
            placeholder="请输入 6 位验证码"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={6}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '验证中...' : '登录'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            更换手机号
          </button>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={
        <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md text-center text-gray-500">
          加载中...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
