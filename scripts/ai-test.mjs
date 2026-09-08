// 独立验证脚本：读 config.json 的 ai 配置，用一封测试邮件调 DeepSeek 提取，打印 JSON。
// 用法：node scripts/ai-test.mjs
import { readFileSync } from 'node:fs'
import OpenAI from 'openai'

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf-8'))
const ai = config.ai
if (!ai?.apiKey) {
  console.error('✗ 未配置 ai.apiKey，请在 config.json 填写 DeepSeek API key')
  process.exit(1)
}

const client = new OpenAI({ apiKey: ai.apiKey, baseURL: ai.baseUrl })

const testEmail = {
  from: '深圳市水务集团 <service@szwater.com>',
  subject: '2026年8月水费缴费通知',
  text: '本期水费 128.60 元，请于 9 月 15 日前通过微信或支付宝完成缴费，逾期将产生滞纳金。'
}

const SYSTEM_PROMPT = `你是一个邮件信息提取助手。从邮件中提取结构化信息，只输出一个 JSON 对象，不要输出任何其他文字或 markdown 代码块。

JSON 字段要求：
- summary: 一句话中文摘要（不超过 60 字）
- category: 分类，只能是以下之一：账单、日程、通知、营销、个人、其他
- urgency: 紧急度，只能是 high / medium / low
- todos: 需要用户采取行动的待办事项数组（没有则为 []）
- entities: 关键实体对象，含 amount(金额，如 "128.60元")、dates(日期数组)、people(人名数组)，没有的字段可省略`

const resp = await client.chat.completions.create({
  model: ai.model,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `发件人：${testEmail.from}\n主题：${testEmail.subject}\n正文：\n${testEmail.text}` }
  ],
  response_format: { type: 'json_object' },
  temperature: 0.2
})

console.log('模型:', ai.model)
console.log('输出:')
console.log(resp.choices[0]?.message?.content ?? '(空)')
