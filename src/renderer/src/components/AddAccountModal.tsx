import { useState } from 'react'
import type { AccountConfig } from '../types'

const PROVIDER_INFO: Record<'qq' | 'gmail', { name: string; hint: string }> = {
  qq: {
    name: 'QQ 邮箱',
    hint: '在 QQ 邮箱网页版「设置 → 账户」中开启 IMAP/SMTP 服务，按提示发送短信验证后，会生成一串 16 位字母的「授权码」。注意：是授权码，不是 QQ 登录密码。'
  },
  gmail: {
    name: 'Gmail',
    hint: '先到 Google 账号开启「两步验证」，再到「安全性 → 应用专用密码」为 Mail 生成一个 16 位「应用专用密码」。注意：是应用专用密码，不是 Google 登录密码。'
  }
}

export default function AddAccountModal({
  onClose,
  onAdded
}: {
  onClose: () => void
  onAdded: (config: Awaited<ReturnType<typeof window.api.addAccount>>) => void
}): React.JSX.Element {
  const [provider, setProvider] = useState<'qq' | 'gmail'>('qq')
  const [email, setEmail] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(): Promise<void> {
    if (!email.trim() || !authCode.trim()) {
      setError('请填写邮箱地址和授权码')
      return
    }
    setBusy(true)
    setError('')
    try {
      const account: AccountConfig = {
        id: `${provider}-${Date.now()}`,
        provider,
        email: email.trim(),
        authCode: authCode.trim()
      }
      const config = await window.api.addAccount(account)
      onAdded(config)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>添加邮箱账号</h3>

        <div className="provider-tabs">
          <button className={provider === 'qq' ? 'active' : ''} onClick={() => setProvider('qq')}>
            QQ 邮箱
          </button>
          <button className={provider === 'gmail' ? 'active' : ''} onClick={() => setProvider('gmail')}>
            Gmail
          </button>
        </div>

        <div className="hint">💡 {PROVIDER_INFO[provider].hint}</div>

        <label className="field">
          <span>邮箱地址</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={provider === 'qq' ? 'you@qq.com' : 'you@gmail.com'}
          />
        </label>

        <label className="field">
          <span>{provider === 'qq' ? '授权码' : '应用专用密码'}</span>
          <input
            type="password"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            placeholder="16 位"
          />
        </label>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            取消
          </button>
          <button className="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? '添加中…' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
