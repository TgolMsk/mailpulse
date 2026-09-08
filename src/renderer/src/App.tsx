import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import MailCard from './components/MailCard'
import MailDetailModal from './components/MailDetailModal'
import Settings from './components/Settings'
import AddAccountModal from './components/AddAccountModal'
import type { Account, AppConfig, CategoryKind, MailItem, StoredMail, UrgencyKind } from './types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

function mapCategory(cat: string): { label: string; kind: CategoryKind } {
  switch (cat) {
    case '账单':
      return { label: '账单', kind: 'fin' }
    case '日程':
      return { label: '日程', kind: 'sched' }
    case '通知':
      return { label: '通知', kind: 'notice' }
    case '营销':
      return { label: '营销', kind: 'notice' }
    default:
      return { label: cat || '其他', kind: 'notice' }
  }
}

function mapUrgency(u: string): { label: string; kind: UrgencyKind } {
  switch (u) {
    case 'high':
      return { label: '高优先', kind: 'urg' }
    case 'medium':
      return { label: '中优先', kind: 'mid' }
    default:
      return { label: '低优先', kind: 'low' }
  }
}

function toMailItem(m: StoredMail): MailItem {
  const ex = m.extracted
  const extras: string[] = []
  if (ex) {
    for (const t of ex.todos) extras.push(`💡 ${t}`)
    if (ex.entities?.amount) extras.push(ex.entities.amount)
    for (const d of ex.entities?.dates ?? []) extras.push(`📅 ${d}`)
    for (const p of ex.entities?.people ?? []) extras.push(p)
  }
  return {
    id: `${m.accountId}-${m.uid}`,
    accountId: m.accountId,
    from: m.from || '(未知发件人)',
    via: `${m.name} · ${m.email}`,
    when: formatTime(m.date),
    date: m.date,
    subject: m.subject,
    summary: ex?.summary || m.text || '(无正文)',
    text: m.text,
    html: m.html,
    category: ex ? mapCategory(ex.category) : { label: '邮件', kind: 'notice' },
    urgency: ex ? mapUrgency(ex.urgency) : { label: '待处理', kind: 'low' },
    extras,
    avatar: { emoji: '📧', bg: '#486048' }
  }
}

export default function App(): React.JSX.Element {
  const [view, setView] = useState<'inbox' | 'settings'>('inbox')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [mails, setMails] = useState<MailItem[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('就绪')
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewingMail, setViewingMail] = useState<MailItem | null>(null)

  const refreshAccounts = useCallback(async (): Promise<void> => {
    try {
      const accs = await window.api.fetchAccounts()
      setAccounts(
        accs.map((a) => ({
          id: a.id,
          name: a.name,
          addr: a.email,
          icon: a.icon,
          iconBg: a.iconBg,
          unread: 0
        }))
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  // 二次打开：从本地 state.json 直接加载已保存的邮件
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const stored = await window.api.fetchHistory()
      setMails(stored.map(toMailItem).sort((a, b) => b.date.localeCompare(a.date)))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleSync = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError('')
    setStatus('正在同步…')
    try {
      const fresh = await window.api.sync()
      await loadHistory()
      setStatus(fresh.length > 0 ? `同步到 ${fresh.length} 封新邮件` : '已是最新，没有新邮件')
    } catch (e) {
      setError((e as Error).message)
      setStatus('同步失败')
    } finally {
      setLoading(false)
    }
  }, [loadHistory])

  useEffect(() => {
    void refreshAccounts()
    void loadHistory()
  }, [refreshAccounts, loadHistory])

  useEffect(() => {
    window.api
      .getConfig()
      .then(setConfig)
      .catch((e) => setError((e as Error).message))
  }, [])

  useEffect(() => {
    // 后台轮询发现新邮件 → 实时追加到列表（不重新加载）
    const off = window.api.onNewMail((items) => {
      const newItems = items.map(toMailItem)
      setMails((prev) => [...newItems, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setStatus(`收到 ${newItems.length} 封新邮件`)
    })
    return off
  }, [])

  function handleConfigChanged(c: AppConfig): void {
    setConfig(c)
    void refreshAccounts()
  }

  function handleAccountAdded(c: AppConfig): void {
    handleConfigChanged(c)
    setShowAdd(false)
  }

  const visibleMails = selectedId ? mails.filter((m) => m.accountId === selectedId) : mails

  if (view === 'settings') {
    return (
      <div className="app">
        <Settings config={config} onChanged={handleConfigChanged} onBack={() => setView('inbox')} />
        {showAdd && (
          <AddAccountModal onClose={() => setShowAdd(false)} onAdded={handleAccountAdded} />
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        accounts={accounts}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onSettings={() => setView('settings')}
        onAddAccount={() => setShowAdd(true)}
      />
      <main className="main">
        <div className="top">
          <h1>{selectedId ? '该账号邮件' : '收件箱'}</h1>
          <div className="top-actions">
            <span className="sync">
              <span className="pulse" />
              {status}
            </span>
            <button className="fetch-btn" onClick={() => void handleSync()} disabled={loading}>
              {loading ? '同步中…' : '立即同步'}
            </button>
          </div>
        </div>
        <div className="subline">本地已保存 {mails.length} 封 · 双击邮件查看完整内容</div>
        {error && <div className="error">{error}</div>}
        <div className="feed">
          {visibleMails.length === 0 && !loading && (
            <div className="empty">暂无已保存的邮件，点击右上角「立即同步」拉取新邮件</div>
          )}
          {visibleMails.map((m) => (
            <MailCard key={m.id} mail={m} onView={setViewingMail} />
          ))}
        </div>
      </main>
      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onAdded={handleAccountAdded} />}
      {viewingMail && <MailDetailModal mail={viewingMail} onClose={() => setViewingMail(null)} />}
    </div>
  )
}
