import { useState, useEffect, useMemo } from 'react'
import { EditorContent as TiptapEditorContent } from '@tiptap/react'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { EditorContent } from './EditorContent'
import { VersionHistory } from './VersionHistory'
import { ArguePanel } from './ArguePanel'
import { useEditorWithCollaboration } from '@/hooks/useEditorWithCollaboration'
import { cn } from '@/lib/utils'
import { History, Sparkles, Moon, Sun } from 'lucide-react'

function getRoomFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') || `doc-${Date.now().toString(36)}`
}

function getOrCreateUserId(): string {
  let id = localStorage.getItem('typeclone-user-id')
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 10)}`
    localStorage.setItem('typeclone-user-id', id)
  }
  return id
}

export function Editor({ userName }: { userName?: string }) {
  const room = useMemo(() => getRoomFromUrl(), [])
  const userId = useMemo(() => getOrCreateUserId(), [])
  const displayName = userName || `User ${userId.slice(-4)}`
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('typeclone-dark-mode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [showHistory, setShowHistory] = useState(false)
  const [showArgue, setShowArgue] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [docPreview, setDocPreview] = useState('')

  const user = useMemo(
    () => ({
      name: displayName,
      color: `hsl(${(userId.charCodeAt(5) * 37) % 360}, 60%, 55%)`,
    }),
    [userId, displayName]
  )

  const { editor, status, peers } = useEditorWithCollaboration({
    room,
    user,
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('typeclone-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (!editor) return

    const updateWordCount = () => {
      const text = editor.getText()
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      setWordCount(words)
    }

    editor.on('update', updateWordCount)
    editor.on('transaction', updateWordCount)
    updateWordCount()

    const doc = editor.state?.doc
    const text = doc ? doc.textBetween(0, Math.min(doc.content.size, 500), ' ') : ''
    setDocPreview(text)

    return () => {
      editor.off('update', updateWordCount)
      editor.off('transaction', updateWordCount)
    }
  }, [editor])

  const handleInsertArgueResponse = (text: string) => {
    if (editor) {
      editor.commands.insertContent(`\n\n**AI Debate Response:**\n\n${text}\n\n`)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">TypeClone</h1>
          <span className="text-xs text-muted-foreground">
            {room}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => setShowArgue(!showArgue)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Argue</span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className={cn(showArgue && 'mr-96')}>
            {editor ? (
              <TiptapEditorContent editor={editor} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Loading editor...</div>
              </div>
            )}
          </div>
        </div>

        <VersionHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          room={room}
        />

        <ArguePanel
          isOpen={showArgue}
          onClose={() => setShowArgue(false)}
          initialText={docPreview}
          onInsertResponse={handleInsertArgueResponse}
        />
      </div>

      <footer className="border-t px-4 py-2">
        <StatusBar status={status} peers={peers} wordCount={wordCount} />
      </footer>

      <EditorContent />
    </div>
  )
}
