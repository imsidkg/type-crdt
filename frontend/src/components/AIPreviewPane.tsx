import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Check, X, Sparkles } from 'lucide-react'

interface AIPreviewPaneProps {
  isOpen: boolean
  action: string
  originalText: string
  response: string
  isStreaming: boolean
  onApply: () => void
  onReject: () => void
  onClose: () => void
  position?: { x: number; y: number }
}

export function AIPreviewPane({
  isOpen,
  action,
  originalText,
  response,
  isStreaming,
  onApply,
  onReject,
  onClose,
  position,
}: AIPreviewPaneProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [response])

  if (!isOpen) return null

  const actionLabels: Record<string, string> = {
    rewrite: 'Rewrite',
    expand: 'Expand',
    shorten: 'Shorten',
    argue: 'Argue',
    'style-match': 'Style Match',
  }

  return (
    <div
      className="fixed z-50 w-[480px] rounded-xl border bg-popover shadow-2xl animate-fade-in"
      style={
        position
          ? { left: position.x, top: position.y }
          : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      }
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{actionLabels[action] || action}</span>
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Original</div>
          <div className="text-sm text-muted-foreground line-clamp-3">{originalText}</div>
        </div>

        <div ref={contentRef} className="max-h-[200px] overflow-y-auto px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Suggestion</div>
          <div className="text-sm whitespace-pre-wrap">
            {response || (
              <span className="text-muted-foreground/50">Generating...</span>
            )}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </button>
        <button
          onClick={onApply}
          disabled={isStreaming || !response}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors',
            isStreaming || !response
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90'
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </button>
      </div>
    </div>
  )
}
