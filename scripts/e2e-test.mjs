// 端到端验证：IMAP 拉真实邮件 → DeepSeek 提取 → 打印结构化结果
// 用法：node scripts/e2e-test.mjs
import { readFileSync } from 'node:fs'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import OpenAI from 'openai'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))
const ai = config.ai
const aiClient = new OpenAI({ apiKey: ai.apiKey, baseURL: ai.baseUrl })

const SYSTEM_PROMPT = `你是一个邮件信息提取助手。从邮件中提取结构化信息，只输出一个 JSON 对象，不要输出任何其他文字或 markdown 代码块。

JSON 字段要求：
- summary: 一句话中文摘要（不超过 60 字）
- category: 分类，只能是以下之一：账单、日程、通知、营销、个人、其他
- urgency: 紧急度，只能是 high / medium / low
- todos: 需要用户采取行动的待办事项数组（没有则为 []）
- entities: 关键实体对象，含 amount(金额，如 "128.60元")、dates(日期数组)、people(人名数组)，没有的字段可省略`

for (const acc of config.accounts) {
  const spec = acc.provider === 'qq' ? { host: 'imap.qq.com', port: 993 } : { host: 'imap.gmail.com', port: 993 }
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
    const sinceUid = Math.max(0, maxUid - 3)
    const range = { uid: `${sinceUid + 1}:*` }

    for await (const msg of client.fetch(range, { uid: true, source: true })) {
      if (!msg.source) continue
      const parsed = await simpleParser(msg.source, {})
      const from = (parsed.from?.text ?? '').trim()
      const subject = parsed.subject ?? '(无主题)'
      const text = (parsed.text ?? '').trim()

      const resp = await aiClient.chat.completions.create({
        model: ai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `发件人：${from}\n主题：${subject}\n正文：\n${text.slice(0, 2000)}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
      const extracted = JSON.parse(resp.choices[0]?.message?.content ?? '{}')

      console.log(`\n=== ${subject} ===`)
      console.log(`发件人: ${from}`)
      console.log(`AI: ${JSON.stringify(extracted, null, 2)}`)
    }
    await client.logout()
  } catch (err) {
    console.error(`\n✗ ${acc.id} 失败: ${err.message}`)
  }
}

console.log('\nDONE')
