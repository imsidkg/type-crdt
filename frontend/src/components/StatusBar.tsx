import { cn } from '@/lib/utils'
import { Wifi, WifiOff, Loader2, Users } from 'lucide-react'
import type { CollabUser } from '@/lib/yjs-utils'

interface StatusBarProps {
  status: 'online' | 'offline' | 'connecting' | 'synced'
  peers: Map<number, CollabUser>
  wordCount: number
}

export function StatusBar({ status, peers, wordCount }: StatusBarProps) {
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

      <div className="ml-auto">
        {wordCount.toLocaleString()} words
      </div>
    </div>
  )
}
