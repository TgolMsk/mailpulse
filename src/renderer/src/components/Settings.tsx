import { useState } from 'react'
import type { AIConfig, AppConfig, PollConfig, TelegramConfig } from '../types'

const DEFAULT_AI: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}

const PROVIDER_NAMES: Record<string, string> = {
  qq: 'QQ 邮箱',
  gmail: 'Gmail'
}

export default function Settings({
  config,
  onChanged,
  onBack
}: {
  config: AppConfig | null
  onChanged: (config: AppConfig) => void
  onBack: () => void
}): React.JSX.Element {
  const [aiForm, setAiForm] = useState<AIConfig>(config?.ai ?? DEFAULT_AI)
  const [pollForm, setPollForm] = useState<PollConfig>(
    config?.poll ?? { enabled: true, intervalSeconds: 300, lookbackHours: 8 }
  )
  const [telegramForm, setTelegramForm] = useState<TelegramConfig>(
    config?.telegram ?? { botToken: '', chatId: '' }
  )
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function handleRemove(id: string): Promise<void> {
    try {
      const c = await window.api.removeAccount(id)
      onChanged(c)
      setMsg('已删除')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function handleSaveAi(): Promise<void> {
    setErr('')
    if (!aiForm.apiKey.trim()) {
      setErr('API Key 不能为空')
      return
    }
    try {
      const c = await window.api.updateAi(aiForm)
      onChanged(c)
      setMsg('模型配置已保存')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function handleSavePoll(): Promise<void> {
    setErr('')
    try {
      const c = await window.api.updatePoll(pollForm)
      onChanged(c)
      setMsg('轮询配置已保存')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function handleSaveTelegram(): Promise<void> {
    setErr('')
    if (!telegramForm.botToken.trim() || !telegramForm.chatId.trim()) {
      setErr('Bot Token 和 Chat ID 都不能为空')
      return
    }
    try {
      const c = await window.api.updateTelegram(telegramForm)
      onChanged(c)
      setMsg('Telegram 配置已保存')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="settings">
      <div className="settings-head">
        <button className="ghost" onClick={onBack}>
          ← 返回
        </button>
        <h2>设置</h2>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h3>邮箱账号</h3>
        </div>
        {config && config.accounts.length > 0 ? (
          config.accounts.map((a) => (
            <div key={a.id} className="acct-row">
              <div className="acct-info">
                <span className="acct-name">{PROVIDER_NAMES[a.provider] ?? a.provider}</span>
                <span className="acct-email">{a.email}</span>
              </div>
              <button className="ghost danger" onClick={() => void handleRemove(a.id)}>
                删除
              </button>
            </div>
          ))
        ) : (
          <div className="empty-sm">尚未添加邮箱账号（可在首页左侧「＋」添加）</div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>大模型配置</h3>
        </div>
        <p className="panel-desc">
          OpenAI 兼容接口：换 Base URL 即可接 OpenAI / DeepSeek / 通义 / 智谱 / Ollama 等。
        </p>
        <label className="field">
          <span>Base URL</span>
          <input
            value={aiForm.baseUrl}
            onChange={(e) => setAiForm({ ...aiForm, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="field">
          <span>模型名称</span>
          <input
            value={aiForm.model}
            onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </label>
        <label className="field">
          <span>API Key</span>
          <input
            type="password"
            value={aiForm.apiKey}
            onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
            placeholder="sk-..."
          />
        </label>
        <button className="primary" onClick={() => void handleSaveAi()}>
          保存模型配置
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Telegram 推送</h3>
        </div>
        <p className="panel-desc">
          从 <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a>{' '}
          创建机器人拿 Token；给你的机器人发条消息后，通过 getUpdates 拿到你的 Chat ID。
        </p>
        <label className="field">
          <span>Bot Token</span>
          <input
            value={telegramForm.botToken}
            onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
            placeholder="123456:ABC..."
          />
        </label>
        <label className="field">
          <span>Chat ID</span>
          <input
            value={telegramForm.chatId}
            onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })}
            placeholder="123456789"
          />
        </label>
        <button className="primary" onClick={() => void handleSaveTelegram()}>
          保存 Telegram 配置
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>自动拉取</h3>
        </div>
        <label className="field row">
          <span>启用后台轮询</span>
          <input
            type="checkbox"
            checked={pollForm.enabled}
            onChange={(e) => setPollForm({ ...pollForm, enabled: e.target.checked })}
          />
        </label>
        <label className="field">
          <span>轮询间隔（秒）</span>
          <input
            type="number"
            min={30}
            value={pollForm.intervalSeconds}
            onChange={(e) => setPollForm({ ...pollForm, intervalSeconds: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>首次回溯时长（小时）</span>
          <input
            type="number"
            min={1}
            value={pollForm.lookbackHours}
            onChange={(e) => setPollForm({ ...pollForm, lookbackHours: Number(e.target.value) })}
          />
        </label>
        <p className="panel-desc">首次添加账号时，回溯拉取最近 N 小时内的邮件；之后只拉新邮件。</p>
        <button className="primary" onClick={() => void handleSavePoll()}>
          保存轮询配置
        </button>
      </section>

      {msg && <div className="msg">{msg}</div>}
      {err && <div className="error">{err}</div>}
    </div>
  )
}
