import { useState } from 'react'

export function LandingPage({ onJoin }: { onJoin: (room: string, name: string) => void }) {
  const [room, setRoom] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (room.trim() && name.trim()) {
      onJoin(room.trim(), name.trim())
    }
  }

  const createNew = () => {
    const newRoom = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    onJoin(newRoom, name.trim() || 'Anonymous')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">TypeSync</h1>
          <p className="text-muted-foreground">
            AI-native document editor with real-time collaboration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="room" className="block text-sm font-medium mb-1.5">
              Document ID (optional)
            </label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="doc-abc123"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!room.trim() || !name.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
            >
              Join Document
            </button>
            <button
              type="button"
              onClick={createNew}
              disabled={!name.trim()}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              Create New
            </button>
          </div>
        </form>

        <div className="mt-8 rounded-lg border p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Quick Tips:</p>
          <ul className="space-y-1">
            <li>• Type <kbd className="rounded bg-muted px-1">/</kbd> in the editor for AI commands</li>
            <li>• Share the document ID to collaborate in real-time</li>
            <li>• Works offline — changes sync when you reconnect</li>
            <li>• Use the Argue panel to debate ideas with AI</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
