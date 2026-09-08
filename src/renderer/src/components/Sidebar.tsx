import type { Account } from '../types'

export default function Sidebar({
  accounts,
  selectedId,
  onSelect,
  onSettings,
  onAddAccount
}: {
  accounts: Account[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSettings: () => void
  onAddAccount: () => void
}): React.JSX.Element {
  return (
    <aside className="side">
      <div className="logo">
        <div className="dot">M</div>
        <div>
          <b>MailPulse</b>
          <span>AI 邮件助手</span>
        </div>
      </div>
      <div className="nav-row">
        <span className="nav-label">邮箱账号</span>
        <button className="add-btn" onClick={onAddAccount} title="添加邮箱">
          ＋
        </button>
      </div>
      {accounts.map((a) => (
        <div
          key={a.id}
          className={`acct${a.id === selectedId ? ' active' : ''}`}
          onClick={() => onSelect(a.id === selectedId ? null : a.id)}
        >
          <div className="ico" style={{ background: a.iconBg }}>
            {a.icon}
          </div>
          <div>
            <div className="name">{a.name}</div>
            <div className="sub">{a.addr}</div>
          </div>
          <div className="badge">{a.unread}</div>
        </div>
      ))}
      <div className="spacer" />
      <div className="foot" onClick={onSettings}>
        <span>⚙️</span>
        <span>设置</span>
      </div>
    </aside>
  )
}
