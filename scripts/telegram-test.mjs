import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))
const tg = config.telegram

const url = `https://api.telegram.org/bot${tg.botToken}/sendMessage`
const resp = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: tg.chatId,
    text: '✅ MailPulse 测试消息：Telegram 推送已打通',
    parse_mode: 'HTML'
  })
})

const body = await resp.json()
console.log('HTTP status:', resp.status)
console.log('ok:', body.ok)
if (body.ok) {
  console.log('message_id:', body.result?.message_id)
  console.log('chat:', body.result?.chat?.username ?? body.result?.chat?.first_name)
} else {
  console.log('error:', JSON.stringify(body))
}
