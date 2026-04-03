import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'

export interface CollabUser {
  name: string
  color: string
}

const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
]

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length]
}

export function createYDoc(): Y.Doc {
  return new Y.Doc()
}

export function createOfflineProvider(doc: Y.Doc, roomName: string): IndexeddbPersistence {
  return new IndexeddbPersistence(roomName, doc)
}

export interface CreateHocuspocusProviderOptions {
  room: string
  document: Y.Doc
  user: CollabUser
  onSynced?: () => void
  onStatus?: (status: string) => void
}

export function createHocuspocusProvider({
  room,
  document,
  user,
  onSynced,
  onStatus,
}: CreateHocuspocusProviderOptions): HocuspocusProvider {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4321'

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: room,
    document,
    onSynced() {
      onSynced?.()
    },
    onStatus({ status }) {
      onStatus?.(status)
    },
    onConnect() {
      provider.setAwarenessField('user', user)
    },
    onDisconnect() {
      provider.setAwarenessField('user', null)
    },
  })

  return provider
}

export function generateRoomId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
