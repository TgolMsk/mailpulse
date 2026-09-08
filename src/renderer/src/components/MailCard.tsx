import type { MailItem } from '../types'

export default function MailCard({
  mail,
  onView
}: {
  mail: MailItem
  onView: (m: MailItem) => void
}): React.JSX.Element {
  return (
    <div className="card" onDoubleClick={() => onView(mail)} title="双击查看完整内容">
      <div className="avatar" style={{ background: mail.avatar.bg }}>
        {mail.avatar.emoji}
      </div>
      <div className="body">
        <div className="row1">
          <span className="from">{mail.from}</span>
          <span className="dotsep">·</span>
          <span className="via">{mail.via}</span>
          <span className="when">{mail.when}</span>
        </div>
        <div className="subject">{mail.subject}</div>
        <div className="summary">{mail.summary}</div>
        <div className="tags">
          <span className={`tag t-cat ${mail.category.kind}`}>{mail.category.label}</span>
          <span className={`tag t-${mail.urgency.kind}`}>{mail.urgency.label}</span>
          {mail.extras.map((e, i) => (
            <span key={i} className="tag t-item">
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
