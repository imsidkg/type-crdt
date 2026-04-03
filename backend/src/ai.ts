import OpenAI from 'openai'
import type { Response } from 'express'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-demo-key',
  baseURL: process.env.OPENAI_BASE_URL,
})

export interface AIRequest {
  action: string
  text: string
  context?: string
  tone?: string
  conversation?: { role: string; content: string }[]
}

const ACTION_PROMPTS: Record<string, string> = {
  rewrite: 'Rewrite the following text to be more {tone}. Keep the same meaning but improve clarity and impact.',
  expand: 'Expand on the following text with more detail, examples, and depth. Make it at least 2x longer.',
  shorten: 'Condense the following text to be more concise while preserving the key points.',
  argue: 'Challenge the following argument thoughtfully. Present counterarguments with evidence and reasoning.',
  'style-match': 'Rewrite the following text to match this writing style: {context}. Preserve the original meaning.',
}

export async function handleAIStream(req: AIRequest, res: Response) {
  const { action, text, context, tone, conversation } = req

  try {
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]

    if (action === 'argue' && conversation && conversation.length > 0) {
      messages = [
        {
          role: 'system',
          content:
            'You are a thoughtful debate partner. Challenge ideas constructively, present counterarguments with nuance, and help refine thinking through respectful discourse. Be direct and substantive.',
        },
        ...conversation.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]
    } else {
      const prompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.rewrite
      const systemPrompt = prompt
        .replace('{tone}', tone || 'clear and confident')
        .replace('{context}', context || '')

      messages = [
        {
          role: 'system',
          content: `${systemPrompt} Return only the rewritten text, no explanations or meta-commentary.`,
        },
        { role: 'user', content: text },
      ]
    }

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: action === 'argue' ? 0.8 : 0.7,
      stream: true,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('AI stream error:', error)
    res.status(500).json({
      error: 'AI request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function handleAICompletion(req: AIRequest): Promise<string> {
  const { action, text, context, tone } = req

  const prompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.rewrite
  const systemPrompt = prompt
    .replace('{tone}', tone || 'clear and confident')
    .replace('{context}', context || '')

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${systemPrompt} Return only the result, no explanations.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || ''
}
