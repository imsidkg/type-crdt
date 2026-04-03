import { MongoClient, type Db } from 'mongodb'

let mongoDb: Db | null = null
let mongoAvailable = false
const editCount = new Map<string, number>()
const inMemoryDocs = new Map<string, { snapshots: InMemorySnapshot[]; deltas: InMemoryDelta[] }>()

interface InMemorySnapshot {
  documentName: string
  snapshot: Uint8Array
  editCount: number
  createdAt: Date
  updatedAt: Date
}

interface InMemoryDelta {
  documentName: string
  update: Uint8Array
  createdAt: Date
}

async function getDb(): Promise<Db | null> {
  if (mongoDb) return mongoDb
  if (!mongoAvailable) return null

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  const dbName = process.env.MONGODB_DB || 'typeclone'

  try {
    const client = new MongoClient(uri)
    await client.connect()
    mongoDb = client.db(dbName)
    console.log('Connected to MongoDB')
    return mongoDb
  } catch {
    mongoAvailable = false
    console.log('MongoDB unavailable, using in-memory storage')
    return null
  }
}

async function getDocStore(documentName: string) {
  if (!inMemoryDocs.has(documentName)) {
    inMemoryDocs.set(documentName, { snapshots: [], deltas: [] })
  }
  return inMemoryDocs.get(documentName)!
}

const SNAPSHOT_INTERVAL = 30
const MAX_DELTAS = 100

async function storeSnapshot(documentName: string, state: Uint8Array, count: number) {
  const db = await getDb()
  if (db) {
    await db.collection('snapshots').updateOne(
      { documentName },
      {
        $set: { documentName, snapshot: Buffer.from(state), editCount: count, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )
    console.log(`Snapshot saved for ${documentName} (edit #${count})`)
    return
  }

  const store = await getDocStore(documentName)
  store.snapshots.push({
    documentName,
    snapshot: new Uint8Array(state),
    editCount: count,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log(`[in-memory] Snapshot saved for ${documentName} (edit #${count})`)
}

async function storeDelta(documentName: string, update: Uint8Array) {
  const db = await getDb()
  if (db) {
    await db.collection('deltas').insertOne({
      documentName,
      update: Buffer.from(update),
      createdAt: new Date(),
    })

    const deltaCount = await db.collection('deltas').countDocuments({ documentName })
    if (deltaCount > MAX_DELTAS) {
      const excess = deltaCount - MAX_DELTAS
      const oldDeltas = await db.collection('deltas').find({ documentName }).sort({ createdAt: 1 }).limit(excess).toArray()
      if (oldDeltas.length > 0) {
        await db.collection('deltas').deleteMany({ _id: { $in: oldDeltas.map((d) => d._id) } })
      }
    }
    return
  }

  const store = await getDocStore(documentName)
  store.deltas.push({ documentName, update: new Uint8Array(update), createdAt: new Date() })
  if (store.deltas.length > MAX_DELTAS) {
    store.deltas = store.deltas.slice(-MAX_DELTAS)
  }
}

async function loadDocument(documentName: string): Promise<Uint8Array | null> {
  const db = await getDb()
  if (db) {
    const snapshot = await db.collection('snapshots').findOne({ documentName })
    if (!snapshot) return null

    let state = snapshot.snapshot
    const deltas = await db.collection('deltas').find({ documentName }).sort({ createdAt: 1 }).toArray()

    if (deltas.length > 0) {
      const { applyUpdate, Doc, encodeStateAsUpdate } = await import('yjs')
      const doc = new Doc()
      applyUpdate(doc, state)
      for (const delta of deltas) {
        applyUpdate(doc, delta.update)
      }
      state = Buffer.from(encodeStateAsUpdate(doc))
    }
    return state
  }

  const store = await getDocStore(documentName)
  if (store.snapshots.length === 0) return null

  const snapshot = store.snapshots[store.snapshots.length - 1]
  let state = snapshot.snapshot

  if (store.deltas.length > 0) {
    const { applyUpdate, Doc, encodeStateAsUpdate } = await import('yjs')
    const doc = new Doc()
    applyUpdate(doc, state)
    for (const delta of store.deltas) {
      applyUpdate(doc, delta.update)
    }
    state = encodeStateAsUpdate(doc)
  }
  return state
}

export const databaseConfig = {
  async fetch({ documentName }: { documentName: string }) {
    try {
      const state = await loadDocument(documentName)
      return state || null
    } catch (error) {
      console.error('Failed to fetch document:', error)
      return null
    }
  },

  async store({ documentName, state }: { documentName: string; state: Uint8Array }) {
    try {
      const count = (editCount.get(documentName) || 0) + 1
      editCount.set(documentName, count)

      await storeDelta(documentName, state)

      if (count % SNAPSHOT_INTERVAL === 0) {
        await storeSnapshot(documentName, state, count)
      }
    } catch (error) {
      console.error('Failed to store document:', error)
    }
  },
}

export async function compactDocument(documentName: string) {
  try {
    const db = await getDb()
    const state = await loadDocument(documentName)
    if (!state) return

    if (db) {
      const snapshot = await db.collection('snapshots').findOne({ documentName })
      const count = snapshot?.editCount || 0
      await db.collection('snapshots').updateOne(
        { documentName },
        { $set: { documentName, snapshot: Buffer.from(state), editCount: count + 1000, updatedAt: new Date() } },
        { upsert: true }
      )
      await db.collection('deltas').deleteMany({ documentName })
    } else {
      const store = await getDocStore(documentName)
      const count = store.snapshots.length > 0 ? store.snapshots[store.snapshots.length - 1].editCount : 0
      store.snapshots = [{
        documentName,
        snapshot: new Uint8Array(state),
        editCount: count + 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]
      store.deltas = []
    }

    console.log(`Compacted ${documentName}`)
  } catch (error) {
    console.error('Failed to compact document:', error)
  }
}

export async function getDocumentHistory(documentName: string) {
  const db = await getDb()
  if (db) {
    const snapshots = await db.collection('snapshots').find({ documentName }).sort({ updatedAt: -1 }).limit(20).toArray()
    const deltaCount = await db.collection('deltas').countDocuments({ documentName })
    return {
      snapshots: snapshots.map((s) => ({ editCount: s.editCount, updatedAt: s.updatedAt, createdAt: s.createdAt })),
      deltaCount,
    }
  }

  const store = await getDocStore(documentName)
  return {
    snapshots: store.snapshots.map((s) => ({ editCount: s.editCount, updatedAt: s.updatedAt, createdAt: s.createdAt })).reverse().slice(0, 20),
    deltaCount: store.deltas.length,
  }
}
