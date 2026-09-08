import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))
const tg = config.telegram

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 模拟一封含 <xxx@yyy.com> 的真实发件人
const from = '"GitHub" <notifications@github.com>'
const text = [
  '📬 <b>新邮件</b> · Gmail',
  '',
  `<b>发件人</b>：${escapeHtml(from)}`,
  '<b>主题</b>：Repository 更新提醒',
  '',
  '<b>摘要</b>：你关注的仓库有 3 个新提交。',
  '',
  '🏷 通知 ｜ ⚡ 紧急度：低'
].join('\n')

const url = `https://api.telegram.org/bot${tg.botToken}/sendMessage`
const resp = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: tg.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
})
const body = await resp.json()
console.log('ok:', body.ok)
console.log(body.ok ? `message_id: ${body.result?.message_id}` : `error: ${body.description}`)
