import { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { SlashMenu, useSlashCommand } from './SlashMenu'
import { AIPreviewPane } from './AIPreviewPane'
import { useAI } from '@/hooks/useAI'

export function EditorContent({ editor }: { editor: Editor | null }) {
  const [pendingResponse, setPendingResponse] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentAction, setCurrentAction] = useState('rewrite')
  const selectionRef = useRef<{ from: number; to: number } | null>(null)
  const responseRef = useRef('')

  const { isStreaming, currentResponse, stream, stop } = useAI()

  const handleAIComplete = useCallback(
    (command: { value: string; label: string }) => {
      if (!editor) return

      const { from, to, empty } = editor.state.selection
      const text = empty
        ? editor.state.doc.textBetween(
            Math.max(0, from - 500),
            from,
            ' '
          )
        : editor.state.doc.textBetween(from, to, ' ')

      setSelectedText(text)
      setCurrentAction(command.value)
      selectionRef.current = empty ? null : { from, to }

      const coords = editor.view.coordsAtPos(from)
      setPreviewPosition({ x: coords.left, y: coords.bottom + 8 })

      responseRef.current = ''
      setPendingResponse('')

      stream({
        action: command.value,
        text: text || 'Generate content here',
        tone: 'clear and confident',
        onChunk: (chunk) => {
          responseRef.current += chunk
          setPendingResponse(responseRef.current)
        },
        onComplete: () => {},
        onError: (error) => {
          console.error('AI error:', error)
          setPendingResponse('Failed to generate response. Please try again.')
        },
      })
    },
    [editor, stream]
  )

  const handleApply = useCallback(() => {
    if (!editor || !pendingResponse) return

    const saved = selectionRef.current
    if (saved) {
      editor.chain().focus().setTextSelection(saved).deleteSelection().insertContent(pendingResponse).run()
    } else {
      editor.commands.insertContent(pendingResponse)
    }

    selectionRef.current = null
    setPendingResponse('')
    setSelectedText('')
    setPreviewPosition(null)
  }, [editor, pendingResponse])

  const handleReject = useCallback(() => {
    selectionRef.current = null
    setPendingResponse('')
    setSelectedText('')
    setPreviewPosition(null)
    stop()
  }, [stop])

  const handleClose = useCallback(() => {
    selectionRef.current = null
    setPendingResponse('')
    setSelectedText('')
    setPreviewPosition(null)
    stop()
  }, [stop])

  const slashCommand = useSlashCommand(handleAIComplete)

  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (slashCommand.state.active) {
        if (event.key === 'Backspace' && slashCommand.state.query.length === 0) {
          slashCommand.close()
          return
        }
        if (/^[a-zA-Z]$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
          slashCommand.updateQuery(slashCommand.state.query + event.key)
          return
        }
        return
      }
      if (event.key === '/') {
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)
        slashCommand.activate(coords.left, coords.bottom + 8)
      }
    }

    const dom = editor.view.dom
    dom.addEventListener('keydown', handleKeyDown)
    return () => {
      dom.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, slashCommand])

  return (
    <>
      {slashCommand.state.active && (
        <SlashMenu
          onSelect={slashCommand.handleSelect}
          onClose={slashCommand.close}
          selectedIndex={slashCommand.state.selectedIndex}
          onIndexChange={slashCommand.setIndex}
          query={slashCommand.state.query}
          position={{ x: slashCommand.state.x, y: slashCommand.state.y }}
        />
      )}

      <AIPreviewPane
        isOpen={!!previewPosition}
        action={currentAction}
        originalText={selectedText}
        response={pendingResponse || currentResponse}
        isStreaming={isStreaming}
        onApply={handleApply}
        onReject={handleReject}
        onClose={handleClose}
        position={previewPosition || undefined}
      />
    </>
  )
}
