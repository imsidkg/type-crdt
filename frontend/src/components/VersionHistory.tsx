import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Clock, ChevronRight, X, History } from 'lucide-react'

interface Snapshot {
  editCount: number
  updatedAt: string
  createdAt: string
}

interface VersionHistoryProps {
  isOpen: boolean
  onClose: () => void
  room: string
  onRestore?: (version: number) => void
}

export function VersionHistory({ isOpen, onClose, room, onRestore }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    fetch(`${apiUrl}/documents/${room}/history`)
      .then((res) => res.json())
      .then((data) => {
        setSnapshots(data.snapshots || [])
      })
      .catch(() => {
        setSnapshots([])
      })
      .finally(() => setLoading(false))
  }, [isOpen, room])

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Version History</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(100% - 53px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No versions saved yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Snapshots are created automatically every 30 edits
            </p>
          </div>
        ) : (
          <div className="p-2">
            {snapshots.map((snapshot, index) => (
              <button
                key={snapshot.editCount}
                onClick={() => {
                  onRestore?.(snapshot.editCount)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  'hover:bg-accent/50'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {snapshots.length - index}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Edit #{snapshot.editCount}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(snapshot.updatedAt).toLocaleString()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
