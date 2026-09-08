import { readFileSync } from 'node:fs'
import { ImapFlow } from 'imapflow'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))
const acc = config.accounts.find((a) => a.provider === 'gmail')

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: { user: acc.email, pass: acc.authCode },
  logger: false
})

await client.connect()
await client.mailboxOpen('INBOX')

const now = new Date()
const since8h = new Date(now.getTime() - 8 * 3600 * 1000)
console.log('now:', now.toISOString())
console.log('since8h:', since8h.toISOString())

const r1 = await client.search({ since: since8h }, { uid: true })
console.log('search({since}, {uid:true}) →', JSON.stringify(r1))

const r2 = await client.search({ since: since8h }, { uid: true })
console.log('search({since}, {uid:true}) →', JSON.stringify(r2))

// 对比：search 全部邮件 UID
const r3 = await client.search({}, { uid: true })
console.log('search({}, {uid:true}) 全部 UID 数 →', Array.isArray(r3) ? r3.length : r3)

await client.logout()
console.log('DONE')
