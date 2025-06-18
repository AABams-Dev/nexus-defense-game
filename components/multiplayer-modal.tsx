"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMultiplayer } from "@/contexts/multiplayer-context"
import { Copy, Check, Users, X } from "lucide-react"

export function MultiplayerModal({ onClose }: { onClose: () => void }) {
  const { createRoom, joinRoom } = useMultiplayer()
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [copied, setCopied] = useState(false)
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add sound effect reference
  const buttonSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize sound effect
  useEffect(() => {
    try {
      buttonSoundRef.current = new Audio("/button-click.mp3")
      if (buttonSoundRef.current) {
        buttonSoundRef.current.volume = 0.6
      }
    } catch (error) {
      console.log("Error initializing button sound:", error)
    }

    return () => {
      if (buttonSoundRef.current) {
        buttonSoundRef.current = null
      }
    }
  }, [])

  // Play sound helper
  const playButtonSound = () => {
    try {
      if (buttonSoundRef.current) {
        buttonSoundRef.current.currentTime = 0
        buttonSoundRef.current.play().catch((e) => console.log("Audio play prevented:", e))
      }
    } catch (error) {
      console.log("Error playing button sound:", error)
    }
  }

  // Update handlers to play sound
  const handleCreateRoom = () => {
    playButtonSound()

    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }

    const newRoomId = createRoom(playerName)
    setCreatedRoomId(newRoomId)
    setError(null)
  }

  const handleJoinRoom = () => {
    playButtonSound()

    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }

    if (!roomId.trim()) {
      setError("Please enter a room ID")
      return
    }

    const success = joinRoom(roomId, playerName)

    if (!success) {
      setError("Room not found or is full")
      return
    }

    onClose()
  }

  const copyToClipboard = () => {
    playButtonSound()

    if (createdRoomId) {
      navigator.clipboard.writeText(createdRoomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    playButtonSound()
    onClose()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md relative">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
        onClick={handleClose}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-light text-white flex items-center">
          <Users className="mr-2 h-5 w-5 text-blue-400" />
          Multiplayer Mode
        </h2>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800">
          <TabsTrigger value="create">Create Game</TabsTrigger>
          <TabsTrigger value="join">Join Game</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Your Name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {!createdRoomId ? (
            <Button onClick={handleCreateRoom} className="w-full bg-blue-600 hover:bg-blue-700">
              Create Room
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Room ID</label>
                <div className="flex">
                  <Input value={createdRoomId} readOnly className="bg-gray-800 border-gray-700" />
                  <Button onClick={copyToClipboard} variant="outline" className="ml-2 bg-gray-800 border-gray-700">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Share this ID with your opponent</p>
              </div>

              <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="join" className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Your Name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Room ID</label>
            <Input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <Button onClick={handleJoinRoom} className="w-full bg-blue-600 hover:bg-blue-700">
            Join Room
          </Button>
        </TabsContent>
      </Tabs>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
    </div>
  )
}
