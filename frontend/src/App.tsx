import { useState } from 'react'
import { LandingPage } from './components/LandingPage'
import { Editor } from './components/Editor'

function App() {
  const [room, setRoom] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('room')
  })
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('typesync-user-name') || ''
  })

  const handleJoin = (newRoom: string, name: string) => {
    setRoom(newRoom)
    setUserName(name)
    localStorage.setItem('typesync-user-name', name)
  }

  if (!room) {
    return <LandingPage onJoin={handleJoin} />
  }

  return <Editor userName={userName} room={room} />
}

export default App
