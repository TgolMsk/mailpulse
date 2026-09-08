import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { MailProvider, ProviderKind, RawEmail } from './types'
import { PROVIDERS } from './providers'

export interface ImapAccountConfig {
  id: string
  provider: ProviderKind
  email: string
  authCode: string
}

/**
 * 通用 IMAP 客户端：QQ / Gmail / 163 / Outlook 等平台共用同一实现，
 * 仅通过 PROVIDERS 里的 host/port 区分。同平台多账户 = 多个 ImapMailProvider 实例。
 */
export class ImapMailProvider implements MailProvider {
  readonly id: string
  readonly email: string
  readonly provider: ProviderKind
  readonly name: string
  private client: ImapFlow

  constructor(config: ImapAccountConfig) {
    const spec = PROVIDERS[config.provider]
    this.id = config.id
    this.email = config.email
    this.provider = config.provider
    this.name = spec.name
    this.client = new ImapFlow({
      host: spec.host,
      port: spec.port,
      secure: true,
      auth: {
        user: config.email,
        pass: config.authCode
      },
      logger: false
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    await this.client.logout().catch(() => {})
  }

  async getMaxUid(): Promise<number> {
    const mailbox = await this.client.mailboxOpen('INBOX')
    return (mailbox.uidNext ?? 1) - 1
  }

  async fetchSince(sinceUid: number): Promise<RawEmail[]> {
    await this.client.mailboxOpen('INBOX')
    const emails: RawEmail[] = []
    const range = { uid: `${sinceUid + 1}:*` }

    for await (const msg of this.client.fetch(range, { uid: true, source: true, internalDate: true })) {
      const parsed = await this.parseMessage(msg)
      if (parsed) emails.push(parsed)
    }
    return emails
  }

  async fetchSinceDate(since: Date): Promise<RawEmail[]> {
    await this.client.mailboxOpen('INBOX')
    const uids = await this.client.search({ since }, { uid: true })
    if (!uids || uids.length === 0) return []

    const emails: RawEmail[] = []
    for await (const msg of this.client.fetch({ uid: uids.join(',') }, { uid: true, source: true, internalDate: true })) {
      const parsed = await this.parseMessage(msg)
      if (parsed) emails.push(parsed)
    }
    return emails
  }

  private async parseMessage(msg: FetchMessageObject): Promise<RawEmail | null> {
    if (!msg.source) return null
    const parsed = await simpleParser(msg.source, {})
    return {
      uid: msg.uid,
      messageId: parsed.messageId ?? '',
      from: (parsed.from?.text ?? '').trim(),
      to: (Array.isArray(parsed.to)
        ? parsed.to.map((a) => a.text).join(', ')
        : (parsed.to?.text ?? '')).trim(),
      subject: parsed.subject ?? '(无主题)',
      date: parsed.date ?? new Date(),
      internalDate: msg.internalDate ? new Date(msg.internalDate) : (parsed.date ?? new Date()),
      text: (parsed.text ?? '').trim(),
      html: parsed.html || '',
      attachments: (parsed.attachments ?? []).map((a) => ({
        filename: a.filename ?? '',
        size: a.size ?? 0,
        contentType: a.contentType ?? ''
      }))
    }
  }
}
