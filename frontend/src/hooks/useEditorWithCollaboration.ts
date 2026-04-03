import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as Y from 'yjs'
import { useEditor } from '@tiptap/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { getEditorExtensions, type SharedProviderRef } from '@/lib/editor-extensions'
import {
  createYDoc,
  createOfflineProvider,
  createHocuspocusProvider,
  type CollabUser,
} from '@/lib/yjs-utils'

export interface UseEditorWithCollaborationOptions {
  room: string
  user: CollabUser
  onStatusChange?: (status: 'online' | 'offline' | 'connecting' | 'synced') => void
}

export function useEditorWithCollaboration({
  room,
  user,
  onStatusChange,
}: UseEditorWithCollaborationOptions) {
  const [status, setStatus] = useState<'online' | 'offline' | 'connecting' | 'synced'>('connecting')
  const [peers, setPeers] = useState<Map<number, CollabUser>>(new Map())
  const providerRef = useRef<HocuspocusProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)

  const ydoc = useMemo(() => createYDoc(), [])
  ydocRef.current = ydoc

  useEffect(() => {
    const offlineProvider = createOfflineProvider(ydoc, room)

    offlineProvider.on('synced', () => {
      console.log('Offline data loaded')
    })

    return () => {
      offlineProvider.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  useEffect(() => {
    const provider = createHocuspocusProvider({
      room,
      document: ydoc,
      user,
      onSynced: () => {
        setStatus('synced')
        onStatusChange?.('synced')
      },
      onStatus: (s) => {
        if (s === 'connected') {
          setStatus('online')
          onStatusChange?.('online')
        } else if (s === 'connecting') {
          setStatus('connecting')
          onStatusChange?.('connecting')
        } else {
          setStatus('offline')
          onStatusChange?.('offline')
        }
      },
    })

    providerRef.current = provider

    provider.on('synced', () => {
      setStatus('synced')
      onStatusChange?.('synced')
    })

    const updatePeers = () => {
      const awareness = provider.awareness
      if (!awareness) return
      const states = awareness.getStates()
      const newPeers = new Map<number, CollabUser>()
      states.forEach((state: unknown, clientId: number) => {
        const s = state as { user?: CollabUser | null }
        if (s.user && clientId !== provider.awareness?.clientID) {
          newPeers.set(clientId, s.user)
        }
      })
      setPeers(newPeers)
    }

    provider.on('awareness-change', updatePeers)
    updatePeers()

    return () => {
      provider.off('awareness-change', updatePeers)
      provider.destroy()
      providerRef.current = null
    }
  }, [room, user.name, user.color])

  const editor = useEditor({
    extensions: getEditorExtensions({ ydoc }, providerRef as unknown as SharedProviderRef),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-8 py-12 mx-auto',
        style: 'max-width: 720px;',
      },
    },
  })

  useEffect(() => {
    if (editor && providerRef.current) {
      const collaborationCaret = editor.extensionManager.extensions.find(
        (e) => e.name === 'collaborationCaret'
      )
      if (collaborationCaret) {
        collaborationCaret.options.provider = providerRef.current
        collaborationCaret.options.user = user
      }
    }
  }, [editor, user])

  const insertAtCursor = useCallback(
    (content: string) => {
      if (!editor) return
      editor.commands.insertContent(content)
    },
    [editor]
  )

  const replaceSelection = useCallback(
    (content: string) => {
      if (!editor) return
      editor.commands.deleteSelection()
      editor.commands.insertContent(content)
    },
    [editor]
  )

  return {
    editor,
    status,
    peers,
    provider: providerRef.current,
    insertAtCursor,
    replaceSelection,
  }
}
