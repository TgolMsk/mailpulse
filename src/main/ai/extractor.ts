import OpenAI from 'openai'

export type UrgencyLevel = 'high' | 'medium' | 'low'

export interface ExtractedMail {
  summary: string
  category: string
  urgency: UrgencyLevel
  todos: string[]
  entities: {
    amount?: string
    dates?: string[]
    people?: string[]
  }
}

export interface AIExtractorConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const SYSTEM_PROMPT = `你是一个邮件信息提取助手。从邮件中提取结构化信息，只输出一个 JSON 对象，不要输出任何其他文字或 markdown 代码块。

JSON 字段要求：
- summary: 一句话中文摘要（不超过 60 字）
- category: 分类，只能是以下之一：账单、日程、通知、营销、个人、其他
- urgency: 紧急度，只能是 high / medium / low
- todos: 需要用户采取行动的待办事项数组（没有则为 []）
- entities: 关键实体对象，含 amount(金额，如 "128.60元")、dates(日期数组)、people(人名数组)，没有的字段可省略`

export class AIExtractor {
  private client: OpenAI
  private model: string

  constructor(config: AIExtractorConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
    this.model = config.model
  }

  async extract(email: { from: string; subject: string; text: string }): Promise<ExtractedMail> {
    const userMsg = `发件人：${email.from}\n主题：${email.subject}\n正文：\n${email.text.slice(0, 2000)}`

    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })

    const content = resp.choices[0]?.message?.content ?? '{}'
    try {
      const parsed = JSON.parse(content) as Partial<ExtractedMail>
      return {
        summary: parsed.summary ?? '',
        category: parsed.category ?? '其他',
        urgency: parsed.urgency ?? 'low',
        todos: Array.isArray(parsed.todos) ? parsed.todos : [],
        entities: parsed.entities ?? {}
      }
    } catch {
      // 解析失败时返回安全默认值，不阻塞流程
      return { summary: '', category: '其他', urgency: 'low', todos: [], entities: {} }
    }
  }
}
