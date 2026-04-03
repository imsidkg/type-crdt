import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, Loader2, Users, Undo, Redo, History } from 'lucide-react'
import type { CollabUser } from '@/lib/yjs-utils'
import type { UndoState } from '@/hooks/useEditorWithCollaboration'

interface StatusBarProps {
  status: 'online' | 'offline' | 'connecting' | 'synced'
  peers: Map<number, CollabUser>
  wordCount: number
  undoState?: UndoState
}

export function StatusBar({ status, peers, wordCount, undoState }: StatusBarProps) {
  const [toast, setToast] = useState<{ type: 'undo' | 'redo'; key: number } | null>(null)

  useEffect(() => {
    if (!undoState?.lastEvent) return
    setToast({ type: undoState.lastEvent.type, key: undoState.lastEvent.timestamp })
    const timer = setTimeout(() => setToast(null), 1500)
    return () => clearTimeout(timer)
  }, [undoState?.lastEvent])
  const statusConfig = {
    online: { icon: Wifi, label: 'Online', color: 'text-green-500' },
    offline: { icon: WifiOff, label: 'Offline', color: 'text-yellow-500' },
    connecting: { icon: Loader2, label: 'Connecting...', color: 'text-blue-500' },
    synced: { icon: Wifi, label: 'Synced', color: 'text-green-500' },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', config.color, status === 'connecting' && 'animate-spin')} />
        <span>{config.label}</span>
      </div>

      {peers.size > 0 && (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>{peers.size + 1} editing</span>
          <div className="flex -space-x-1.5">
            {Array.from(peers.values()).map((peer, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white"
                style={{ backgroundColor: peer.color }}
                title={peer.name}
              >
                {peer.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {undoState && undoState.undoCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Undo className="h-3 w-3" />
          <span>
            {undoState.undoCount} undoable
            {undoState.restoredFromSession && (
              <span className="ml-1 text-primary" title="Undo history restored from previous session">
                <History className="inline h-3 w-3 -mt-0.5" />
              </span>
            )}
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {toast && (
          <span
            key={toast.key}
            className="flex items-center gap-1 text-primary animate-in fade-in slide-in-from-right-2 duration-200"
          >
            {toast.type === 'undo' ? <Undo className="h-3 w-3" /> : <Redo className="h-3 w-3" />}
            {toast.type === 'undo' ? 'Undone (your change)' : 'Redone (your change)'}
          </span>
        )}
        {wordCount.toLocaleString()} words
      </div>
    </div>
  )
}
