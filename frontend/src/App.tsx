import { useState } from 'react'
import { LandingPage } from './components/LandingPage'
import { Editor } from './components/Editor'

function App() {
  const [room, setRoom] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  const handleJoin = (newRoom: string, name: string) => {
    setRoom(newRoom)
    setUserName(name)
  }

  if (!room) {
    return <LandingPage onJoin={handleJoin} />
  }

  return <Editor userName={userName} />
}

export default App
