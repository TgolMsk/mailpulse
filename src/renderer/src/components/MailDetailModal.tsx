import { useState } from 'react'
import type { MailItem } from '../types'

export default function MailDetailModal({
  mail,
  onClose
}: {
  mail: MailItem
  onClose: () => void
}): React.JSX.Element {
  const hasHtml = !!mail.html
  const [mode, setMode] = useState<'html' | 'text'>(hasHtml ? 'html' : 'text')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{mail.subject}</h3>
          <button className="ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="mail-meta">
          <div>
            <span className="meta-label">发件人</span>
            {mail.from}
          </div>
          <div>
            <span className="meta-label">账号</span>
            {mail.via}
          </div>
          <div>
            <span className="meta-label">时间</span>
            {mail.when}
          </div>
          {mail.category && (
            <div>
              <span className="meta-label">分类</span>
              {mail.category.label} · {mail.urgency.label}
            </div>
          )}
        </div>

        {hasHtml && (
          <div className="mail-view-toggle">
            <button className={mode === 'html' ? 'active' : ''} onClick={() => setMode('html')}>
              HTML 视图
            </button>
            <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
              纯文本
            </button>
          </div>
        )}

        {mode === 'html' && mail.html ? (
          <iframe
            srcDoc={mail.html}
            sandbox=""
            className="mail-html-frame"
            title="邮件 HTML 内容"
          />
        ) : (
          <div className="mail-body">{mail.text || '(无正文)'}</div>
        )}
      </div>
    </div>
  )
}
