import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

const AI_COMMANDS = [
  { label: 'Rewrite', value: 'rewrite', icon: '✏️', description: 'Rewrite selected text' },
  { label: 'Expand', value: 'expand', icon: '📝', description: 'Expand with more detail' },
  { label: 'Shorten', value: 'shorten', icon: '✂️', description: 'Make it more concise' },
  { label: 'Argue', value: 'argue', icon: '🤔', description: 'Challenge this argument' },
  { label: 'Style Match', value: 'style-match', icon: '🎨', description: 'Match writing style' },
]

interface SlashMenuProps {
  onSelect: (command: { value: string; label: string }) => void
  onClose: () => void
  selectedIndex: number
  onIndexChange: (index: number) => void
  query: string
  position?: { x: number; y: number }
}

export function SlashMenu({ onSelect, onClose, selectedIndex, onIndexChange, query, position }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const filteredCommands = AI_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.value.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onIndexChange(Math.min(selectedIndex + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onIndexChange(Math.max(selectedIndex - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, filteredCommands, onSelect, onClose, onIndexChange])

  useEffect(() => {
    if (menuRef.current && filteredCommands[selectedIndex]) {
      const selectedElement = menuRef.current.children[selectedIndex] as HTMLElement
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (filteredCommands.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 rounded-xl border bg-popover p-1 shadow-lg animate-fade-in"
      style={{ maxHeight: '320px', overflowY: 'auto', left: position?.x, top: position?.y }}
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">AI Commands</div>
      {filteredCommands.map((command, index) => (
        <button
          key={command.value}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors',
            index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
          )}
          onClick={() => onSelect(command)}
          onMouseEnter={() => onIndexChange(index)}
        >
          <span className="text-base">{command.icon}</span>
          <div className="flex-1">
            <div className="font-medium">{command.label}</div>
            <div className="text-xs text-muted-foreground">{command.description}</div>
          </div>
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            ↵
          </kbd>
        </button>
      ))}
    </div>
  )
}

interface SlashCommandState {
  active: boolean
  query: string
  selectedIndex: number
  x: number
  y: number
}

export function useSlashCommand(onSelect: (command: { value: string; label: string }) => void) {
  const [state, setState] = useState<SlashCommandState>({
    active: false,
    query: '',
    selectedIndex: 0,
    x: 0,
    y: 0,
  })

  const activate = useCallback((x: number, y: number) => {
    setState({ active: true, query: '', selectedIndex: 0, x, y })
  }, [])

  const updateQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, query, selectedIndex: 0 }))
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, active: false, query: '', selectedIndex: 0 }))
  }, [])

  const setIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, selectedIndex: index }))
  }, [])

  const handleSelect = useCallback(
    (command: { value: string; label: string }) => {
      close()
      onSelect(command)
    },
    [onSelect, close]
  )

  return {
    state,
    activate,
    updateQuery,
    close,
    setIndex,
    handleSelect,
  }
}
