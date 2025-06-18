"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useMultiplayer } from "@/contexts/multiplayer-context"
import { ArrowLeft, Users, UserCheck, Clock, X } from "lucide-react"

export function MultiplayerLobby({ onBack }: { onBack: () => void }) {
  const { multiplayerState, leaveRoom, startGame, setReady } = useMultiplayer()
  const [isReady, setIsReady] = useState(false)

  const buttonSoundRef = useRef<HTMLAudioElement | null>(null)

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

  const handleReady = () => {
    playButtonSound()
    setIsReady(!isReady)
    setReady(!isReady)
  }

  const handleStartGame = () => {
    playButtonSound()
    startGame()
  }

  const handleLeaveRoom = () => {
    playButtonSound()
    leaveRoom()
    onBack()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md relative">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
        onClick={handleLeaveRoom}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-light text-white flex items-center">
          <Users className="mr-2 h-5 w-5 text-blue-400" />
          Multiplayer Lobby
        </h2>
        <Button variant="ghost" size="icon" onClick={handleLeaveRoom} title="Leave Room">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Room ID</div>
          <div className="text-white font-mono bg-gray-900 p-2 rounded border border-gray-700 text-center">
            {multiplayerState.roomId}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-3">Players</div>

          <div className="space-y-3">
            {/* Host player */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-white">
                  {multiplayerState.isHost ? multiplayerState.playerName : multiplayerState.opponentName} (Host)
                </span>
              </div>
              {multiplayerState.isHost ? (
                isReady ? (
                  <UserCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )
              ) : multiplayerState.opponentReady ? (
                <UserCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-500" />
              )}
            </div>

            {/* Guest player */}
            {multiplayerState.opponentName && !multiplayerState.isHost ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-white">{multiplayerState.playerName} (You)</span>
                </div>
                {isReady ? (
                  <UserCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ) : multiplayerState.opponentName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-white">{multiplayerState.opponentName}</span>
                </div>
                {multiplayerState.opponentReady ? (
                  <UserCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm italic">Waiting for opponent to join...</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleReady}
            variant={isReady ? "default" : "outline"}
            className={isReady ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700 border-gray-700"}
          >
            {isReady ? "Ready" : "Mark as Ready"}
          </Button>

          {multiplayerState.isHost && (
            <Button
              onClick={handleStartGame}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!isReady || !multiplayerState.opponentReady || !multiplayerState.opponentName}
            >
              Start Game
            </Button>
          )}

          {!multiplayerState.isHost && (
            <div className="text-center text-sm text-gray-400">Waiting for host to start the game...</div>
          )}
        </div>
      </div>
    </div>
  )
}
