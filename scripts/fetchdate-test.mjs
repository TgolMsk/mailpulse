import { readFileSync } from 'node:fs'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

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

const since = new Date(Date.now() - 8 * 3600 * 1000)
const uids = await client.search({ since }, { uid: true })
console.log('search since → uids:', JSON.stringify(uids))

if (uids && uids.length > 0) {
  const range = { uid: uids.join(',') }
  console.log('fetch range:', JSON.stringify(range))
  for await (const msg of client.fetch(range, { uid: true, source: true })) {
    console.log('fetched uid:', msg.uid, '| source length:', msg.source?.length)
    if (msg.source) {
      const parsed = await simpleParser(msg.source, {})
      console.log('  subject:', parsed.subject)
      console.log('  date:', parsed.date?.toISOString())
    }
  }
}

await client.logout()
console.log('DONE')
