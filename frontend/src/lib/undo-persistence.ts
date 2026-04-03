import { createDeleteSet, UndoManager } from 'yjs'

/**
 * Cross-session undo persistence for Yjs UndoManager.
 *
 * Serializes the undo/redo stacks (which contain DeleteSet references to
 * CRDT item IDs) into IndexedDB, keyed by room + user. On page reload,
 * restores the stacks so the user can undo changes from their previous session.
 *
 * This works because Yjs item IDs (clientID, clock) are immutable — even if
 * other users edit the document between sessions, the IDs remain valid.
 * The UndoManager's undo logic already handles concurrent changes gracefully.
 */

// ── Types ──────────────────────────────────────────────────────────────

interface DeleteSetLike {
  clients: Map<number, { clock: number; len: number }[]>
}

interface StackItemLike {
  insertions: DeleteSetLike
  deletions: DeleteSetLike
  meta: Map<string, unknown>
}

interface SerializedDeleteSet {
  /** Array of [clientID, ranges[]] pairs */
  clients: [number, { clock: number; len: number }[]][]
}

interface SerializedStackItem {
  insertions: SerializedDeleteSet
  deletions: SerializedDeleteSet
}

interface SerializedUndoState {
  undoStack: SerializedStackItem[]
  redoStack: SerializedStackItem[]
  savedAt: number
}

// ── Serialization ──────────────────────────────────────────────────────

function serializeDeleteSet(ds: DeleteSetLike): SerializedDeleteSet {
  const clients: [number, { clock: number; len: number }[]][] = []
  for (const [clientId, ranges] of ds.clients) {
    clients.push([
      clientId,
      ranges.map((r: { clock: number; len: number }) => ({ clock: r.clock, len: r.len })),
    ])
  }
  return { clients }
}

function deserializeDeleteSet(data: SerializedDeleteSet): DeleteSetLike {
  const ds = createDeleteSet()
  for (const [clientId, ranges] of data.clients) {
    ds.clients.set(
      clientId,
      ranges.map((r) => ({ clock: r.clock, len: r.len }))
    )
  }
  return ds
}

function serializeStack(stack: StackItemLike[]): SerializedStackItem[] {
  return stack.map((item) => ({
    insertions: serializeDeleteSet(item.insertions),
    deletions: serializeDeleteSet(item.deletions),
  }))
}

function deserializeStack(data: SerializedStackItem[]): StackItemLike[] {
  return data.map((item) => ({
    insertions: deserializeDeleteSet(item.insertions),
    deletions: deserializeDeleteSet(item.deletions),
    meta: new Map(),
  }))
}

export function serializeUndoStacks(um: UndoManager): SerializedUndoState {
  return {
    undoStack: serializeStack(um.undoStack as unknown as StackItemLike[]),
    redoStack: serializeStack(um.redoStack as unknown as StackItemLike[]),
    savedAt: Date.now(),
  }
}

export function restoreUndoStacks(
  um: UndoManager,
  state: SerializedUndoState
): { undoCount: number; redoCount: number } {
  // Prepend saved items before any items created in the current session
  const restoredUndo = deserializeStack(state.undoStack)
  const restoredRedo = deserializeStack(state.redoStack)

  ;(um.undoStack as unknown as StackItemLike[]).unshift(...restoredUndo)
  ;(um.redoStack as unknown as StackItemLike[]).unshift(...restoredRedo)

  return {
    undoCount: um.undoStack.length,
    redoCount: um.redoStack.length,
  }
}

// ── IndexedDB Storage ──────────────────────────────────────────────────

const DB_NAME = 'typesync-undo'
const DB_VERSION = 1
const STORE_NAME = 'undo-stacks'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function storageKey(room: string, userName: string): string {
  return `${room}::${userName}`
}

export async function saveUndoState(
  room: string,
  userName: string,
  state: SerializedUndoState
): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(state, storageKey(room, userName))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('Failed to save undo state:', err)
  }
}

export async function loadUndoState(
  room: string,
  userName: string
): Promise<SerializedUndoState | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(storageKey(room, userName))
    const result = await new Promise<SerializedUndoState | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return result ?? null
  } catch (err) {
    console.warn('Failed to load undo state:', err)
    return null
  }
}

export async function clearUndoState(room: string, userName: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(storageKey(room, userName))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('Failed to clear undo state:', err)
  }
}
