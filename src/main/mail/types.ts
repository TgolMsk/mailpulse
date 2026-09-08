export type ProviderKind = 'qq' | 'gmail'

export interface MailAttachment {
  filename: string
  size: number
  contentType: string
}

export interface RawEmail {
  uid: number
  messageId: string
  from: string
  to: string
  subject: string
  date: Date
  internalDate: Date
  text: string
  html: string
  attachments: MailAttachment[]
}

export interface MailProvider {
  /** 账户唯一标识（同平台多账户靠它区分，去重键的一部分） */
  readonly id: string
  readonly email: string
  readonly provider: ProviderKind
  /** 平台显示名（'QQ 邮箱' / 'Gmail'） */
  readonly name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  /** 当前收件箱最大 UID（用于建立拉取基线） */
  getMaxUid(): Promise<number>
  /** 拉取 UID > sinceUid 的邮件（含正文），按 UID 升序 */
  fetchSince(sinceUid: number): Promise<RawEmail[]>
  /** 拉取指定时间之后到达的邮件（IMAP SINCE 搜索，用于首次运行回溯） */
  fetchSinceDate(since: Date): Promise<RawEmail[]>
}
