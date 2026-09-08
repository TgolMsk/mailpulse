// 独立验证脚本：直接读 config.json，用 IMAP 拉取各账号最近邮件并打印。
// 用法：node scripts/fetch-test.mjs
import { readFileSync } from 'node:fs'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))

for (const acc of config.accounts) {
  const spec =
    acc.provider === 'qq'
      ? { host: 'imap.qq.com', port: 993 }
      : { host: 'imap.gmail.com', port: 993 }

  const client = new ImapFlow({
    host: spec.host,
    port: spec.port,
    secure: true,
    auth: { user: acc.email, pass: acc.authCode },
    logger: false
  })

  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const maxUid = (mailbox.uidNext ?? 1) - 1
    console.log(`\n=== ${acc.id} (${acc.email}) ===`)
    console.log(`平台: ${acc.provider} | 总邮件: ${mailbox.exists} | maxUid: ${maxUid}`)

    const sinceUid = Math.max(0, maxUid - 5)
    const range = { uid: `${sinceUid + 1}:*` }
    for await (const msg of client.fetch(range, { uid: true, source: true })) {
      if (!msg.source) continue
      const parsed = await simpleParser(msg.source, {})
      console.log(`\n--- UID ${msg.uid} ---`)
      console.log(`From:    ${parsed.from?.text ?? ''}`)
      console.log(`Subject: ${parsed.subject ?? '(无主题)'}`)
      console.log(`Date:    ${parsed.date?.toISOString() ?? ''}`)
      console.log(`Text:    ${(parsed.text ?? '').slice(0, 200)}`)
    }
    await client.logout()
  } catch (err) {
    console.error(`\n✗ ${acc.id} 拉取失败: ${err.message}`)
  }
}

console.log('\nDONE')
