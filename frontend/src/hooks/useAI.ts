import { useState, useCallback, useRef } from 'react'

export interface AIStreamOptions {
  action: string
  text: string
  context?: string
  tone?: string
  conversation?: { role: string; content: string }[]
  onChunk: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export function useAI() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(
    ({ action, text, context, tone, conversation, onChunk, onComplete, onError }: AIStreamOptions) => {
      abortRef.current = new AbortController()
      setIsStreaming(true)
      setCurrentResponse('')

      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      fetch(`${apiUrl}/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text, context, tone, conversation }),
        signal: abortRef.current.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`AI request failed: ${response.statusText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No response body')

          const decoder = new TextDecoder()
          let fullResponse = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  setCurrentResponse(fullResponse)
                  setIsStreaming(false)
                  onComplete()
                  return
                }
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    fullResponse += parsed.content
                    setCurrentResponse(fullResponse)
                    onChunk(parsed.content)
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setIsStreaming(false)
            onError(error)
          }
        })
    },
    []
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return {
    isStreaming,
    currentResponse,
    stream,
    stop,
  }
}
