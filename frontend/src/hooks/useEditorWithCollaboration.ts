import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as Y from 'yjs'
import { useEditor } from '@tiptap/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { yUndoPluginKey } from '@tiptap/y-tiptap'
import { getEditorExtensions, type SharedProviderRef } from '@/lib/editor-extensions'
import {
  createYDoc,
  createOfflineProvider,
  createHocuspocusProvider,
  type CollabUser,
} from '@/lib/yjs-utils'
import {
  serializeUndoStacks,
  restoreUndoStacks,
  saveUndoState,
  loadUndoState,
} from '@/lib/undo-persistence'

export interface UndoState {
  undoCount: number
  redoCount: number
  lastEvent: { type: 'undo' | 'redo'; timestamp: number } | null
  restoredFromSession: boolean
}

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
  const [undoState, setUndoState] = useState<UndoState>({ undoCount: 0, redoCount: 0, lastEvent: null, restoredFromSession: false })
  const providerRef = useRef<HocuspocusProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const offlineSyncedRef = useRef(false)
  const undoRestoredRef = useRef(false)

  const ydoc = useMemo(() => createYDoc(), [])
  ydocRef.current = ydoc

  useEffect(() => {
    const offlineProvider = createOfflineProvider(ydoc, room)

    offlineProvider.on('synced', () => {
      console.log('Offline data loaded')
      offlineSyncedRef.current = true
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

  // Track per-user undo/redo stack + persist to IndexedDB for cross-session undo
  useEffect(() => {
    if (!editor) return

    const pluginState = yUndoPluginKey.getState(editor.state)
    const undoManager = pluginState?.undoManager as Y.UndoManager | undefined
    if (!undoManager) return

    let saveTimeout: ReturnType<typeof setTimeout> | null = null

    // Restore undo stacks from previous session
    const attemptRestore = async () => {
      if (undoRestoredRef.current) return
      undoRestoredRef.current = true

      const saved = await loadUndoState(room, user.name)
      if (saved) {
        const counts = restoreUndoStacks(undoManager, saved)
        setUndoState((prev) => ({
          ...prev,
          undoCount: counts.undoCount,
          redoCount: counts.redoCount,
          restoredFromSession: true,
        }))
        console.log(
          `Restored undo state: ${counts.undoCount} undo, ${counts.redoCount} redo items`
        )
      }
    }

    // Wait for offline sync before restoring, or restore immediately if already synced
    if (offlineSyncedRef.current) {
      attemptRestore()
    } else {
      const checkInterval = setInterval(() => {
        if (offlineSyncedRef.current) {
          clearInterval(checkInterval)
          attemptRestore()
        }
      }, 100)
      // Give up after 5 seconds — restore anyway
      setTimeout(() => {
        clearInterval(checkInterval)
        attemptRestore()
      }, 5000)
    }

    // Debounced save to IndexedDB
    const scheduleSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        saveUndoState(room, user.name, serializeUndoStacks(undoManager))
      }, 1000)
    }

    const updateStacks = () => {
      setUndoState((prev) => ({
        ...prev,
        undoCount: undoManager.undoStack.length,
        redoCount: undoManager.redoStack.length,
      }))
    }

    const onStackItemAdded = () => {
      updateStacks()
      scheduleSave()
    }

    const onStackItemPopped = (event: { type: 'undo' | 'redo' }) => {
      setUndoState((prev) => ({
        ...prev,
        undoCount: undoManager.undoStack.length,
        redoCount: undoManager.redoStack.length,
        lastEvent: { type: event.type, timestamp: Date.now() },
      }))
      scheduleSave()
    }

    undoManager.on('stack-item-added', onStackItemAdded)
    undoManager.on('stack-item-popped', onStackItemPopped)
    updateStacks()

    return () => {
      undoManager.off('stack-item-added', onStackItemAdded)
      undoManager.off('stack-item-popped', onStackItemPopped)
      // Final save on cleanup
      if (saveTimeout) clearTimeout(saveTimeout)
      saveUndoState(room, user.name, serializeUndoStacks(undoManager))
    }
  }, [editor, room, user.name])

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
    undoState,
    provider: providerRef.current,
    insertAtCursor,
    replaceSelection,
  }
}
