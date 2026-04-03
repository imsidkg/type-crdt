import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { MessageSquare, X, Send, Sparkles } from 'lucide-react'
import { useAI } from '@/hooks/useAI'

interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
  isAI?: boolean
}

interface ArguePanelProps {
  isOpen: boolean
  onClose: () => void
  initialText: string
  onInsertResponse?: (text: string) => void
}

export function ArguePanel({ isOpen, onClose, initialText, onInsertResponse }: ArguePanelProps) {
  const [messages, setMessages] = useState<Comment[]>([
    {
      id: '1',
      author: 'AI',
      content: `Let me challenge this argument:\n\n${initialText ? `"${initialText}"\n\n` : ''}What's the strongest evidence supporting this claim? Have you considered alternative perspectives?`,
      timestamp: new Date(),
      isAI: true,
    },
  ])
  const [input, setInput] = useState('')
  const responseAccumulator = useRef('')
  const { isStreaming, currentResponse, stream } = useAI()

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return

    const userMessage: Comment = {
      id: Date.now().toString(),
      author: 'You',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    const allMessages = messages.concat(userMessage)
    const conversation = allMessages.map((m) => ({
      role: m.isAI ? 'assistant' : 'user',
      content: m.content,
    }))

    responseAccumulator.current = ''

    stream({
      action: 'argue',
      text: initialText,
      conversation,
      onChunk: (chunk) => {
        responseAccumulator.current += chunk
      },
      onComplete: () => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            author: 'AI',
            content: responseAccumulator.current,
            timestamp: new Date(),
            isAI: true,
          },
        ])
      },
      onError: (error) => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            author: 'AI',
            content: `Sorry, I encountered an error: ${error.message}`,
            timestamp: new Date(),
            isAI: true,
          },
        ])
      },
    })
  }, [input, isStreaming, messages, initialText, stream])

  const handleInsert = useCallback(
    (content: string) => {
      onInsertResponse?.(content)
    },
    [onInsertResponse]
  )

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-96 border-l bg-background flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Debate with AI</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.isAI ? 'flex-row' : 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white',
                message.isAI ? 'bg-violet-500' : 'bg-primary'
              )}
            >
              {message.isAI ? <Sparkles className="h-3.5 w-3.5" /> : 'Y'}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                message.isAI ? 'bg-muted' : 'bg-primary text-primary-foreground'
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="mt-1 text-[10px] opacity-60">
                {message.timestamp.toLocaleTimeString()}
              </div>
              {message.isAI && (
                <button
                  onClick={() => handleInsert(message.content)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Insert into document
                </button>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
              <div className="whitespace-pre-wrap">{currentResponse}</div>
              <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Respond to the AI..."
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
