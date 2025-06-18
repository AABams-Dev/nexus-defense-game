"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface MultiplayerState {
  isMultiplayer: boolean
  roomId: string | null
  playerId: string | null
  playerName: string
  opponentName: string | null
  isHost: boolean
  gameStarted: boolean
  playerTurn: string | null
  opponentReady: boolean
}

interface MultiplayerContextType {
  multiplayerState: MultiplayerState
  setMultiplayerMode: (isMultiplayer: boolean) => void
  createRoom: (playerName: string) => string
  joinRoom: (roomId: string, playerName: string) => boolean
  leaveRoom: () => void
  startGame: () => void
  setReady: (ready: boolean) => void
  endTurn: () => void
  syncGameState: (gameState: any) => void
  getGameState: () => any | null
}

const defaultState: MultiplayerState = {
  isMultiplayer: false,
  roomId: null,
  playerId: null,
  playerName: "",
  opponentName: null,
  isHost: false,
  gameStarted: false,
  playerTurn: null,
  opponentReady: false,
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined)

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>(defaultState)

  // Generate a unique ID for rooms or players
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9)
  }

  // Set multiplayer mode on/off
  const setMultiplayerMode = (isMultiplayer: boolean) => {
    setMultiplayerState((prev) => ({
      ...prev,
      isMultiplayer,
    }))
  }

  // Create a new multiplayer room
  const createRoom = (playerName: string) => {
    const roomId = generateId()
    const playerId = generateId()

    const roomData = {
      roomId,
      host: {
        id: playerId,
        name: playerName,
        ready: false,
      },
      guest: null,
      gameStarted: false,
      currentTurn: playerId,
      gameState: null,
      lastUpdated: Date.now(),
    }

    // Save room data to localStorage
    localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(roomData))

    setMultiplayerState({
      isMultiplayer: true,
      roomId,
      playerId,
      playerName,
      opponentName: null,
      isHost: true,
      gameStarted: false,
      playerTurn: playerId,
      opponentReady: false,
    })

    return roomId
  }

  // Join an existing room
  const joinRoom = (roomId: string, playerName: string) => {
    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (!roomData) {
      return false
    }

    const room = JSON.parse(roomData)

    // Check if room is full
    if (room.guest) {
      return false
    }

    const playerId = generateId()

    // Update room with guest info
    room.guest = {
      id: playerId,
      name: playerName,
      ready: false,
    }
    room.lastUpdated = Date.now()

    localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))

    setMultiplayerState({
      isMultiplayer: true,
      roomId,
      playerId,
      playerName,
      opponentName: room.host.name,
      isHost: false,
      gameStarted: false,
      playerTurn: room.currentTurn,
      opponentReady: room.host.ready,
    })

    return true
  }

  // Leave the current room
  const leaveRoom = () => {
    const { roomId, playerId, isHost } = multiplayerState

    if (roomId) {
      const roomData = localStorage.getItem(`nexus-room-${roomId}`)

      if (roomData) {
        const room = JSON.parse(roomData)

        if (isHost) {
          // If host leaves, delete the room
          localStorage.removeItem(`nexus-room-${roomId}`)
        } else {
          // If guest leaves, update room
          room.guest = null
          room.lastUpdated = Date.now()
          localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))
        }
      }
    }

    setMultiplayerState(defaultState)
  }

  // Start the multiplayer game
  const startGame = () => {
    const { roomId, isHost } = multiplayerState

    if (!roomId || !isHost) return

    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (roomData) {
      const room = JSON.parse(roomData)
      room.gameStarted = true
      room.lastUpdated = Date.now()

      localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))

      setMultiplayerState((prev) => ({
        ...prev,
        gameStarted: true,
      }))
    }
  }

  // Set player ready status
  const setReady = (ready: boolean) => {
    const { roomId, playerId, isHost } = multiplayerState

    if (!roomId) return

    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (roomData) {
      const room = JSON.parse(roomData)

      if (isHost) {
        room.host.ready = ready
      } else if (room.guest && room.guest.id === playerId) {
        room.guest.ready = ready
      }

      room.lastUpdated = Date.now()
      localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))
    }
  }

  // End current player's turn
  const endTurn = () => {
    const { roomId, playerId, isHost } = multiplayerState

    if (!roomId) return

    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (roomData) {
      const room = JSON.parse(roomData)

      // Switch turns
      if (room.host && room.guest) {
        room.currentTurn = room.currentTurn === room.host.id ? room.guest.id : room.host.id
        room.lastUpdated = Date.now()

        localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))

        setMultiplayerState((prev) => ({
          ...prev,
          playerTurn: room.currentTurn,
        }))
      }
    }
  }

  // Sync game state to localStorage
  const syncGameState = (gameState: any) => {
    const { roomId } = multiplayerState

    if (!roomId) return

    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (roomData) {
      const room = JSON.parse(roomData)
      room.gameState = gameState
      room.lastUpdated = Date.now()

      localStorage.setItem(`nexus-room-${roomId}`, JSON.stringify(room))
    }
  }

  // Get current game state from localStorage
  const getGameState = () => {
    const { roomId } = multiplayerState

    if (!roomId) return null

    const roomData = localStorage.getItem(`nexus-room-${roomId}`)

    if (roomData) {
      const room = JSON.parse(roomData)
      return room.gameState
    }

    return null
  }

  // Poll for updates in multiplayer room
  useEffect(() => {
    if (!multiplayerState.isMultiplayer || !multiplayerState.roomId) return

    const pollInterval = setInterval(() => {
      const { roomId, playerId, isHost } = multiplayerState

      if (!roomId) return

      const roomData = localStorage.getItem(`nexus-room-${roomId}`)

      if (!roomData) {
        // Room was deleted
        if (!isHost) {
          setMultiplayerState(defaultState)
        }
        return
      }

      const room = JSON.parse(roomData)

      // Update state based on room data
      if (isHost && room.guest) {
        setMultiplayerState((prev) => ({
          ...prev,
          opponentName: room.guest.name,
          opponentReady: room.guest.ready,
          gameStarted: room.gameStarted,
          playerTurn: room.currentTurn,
        }))
      } else if (!isHost) {
        setMultiplayerState((prev) => ({
          ...prev,
          opponentReady: room.host.ready,
          gameStarted: room.gameStarted,
          playerTurn: room.currentTurn,
        }))

        // Check if host left
        if (!room.host) {
          setMultiplayerState(defaultState)
        }
      }
    }, 1000)

    return () => clearInterval(pollInterval)
  }, [
    multiplayerState.isMultiplayer,
    multiplayerState.roomId,
    multiplayerState.playerId,
    multiplayerState.isHost,
    multiplayerState,
  ])

  return (
    <MultiplayerContext.Provider
      value={{
        multiplayerState,
        setMultiplayerMode,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        setReady,
        endTurn,
        syncGameState,
        getGameState,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  )
}

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext)
  if (context === undefined) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider")
  }
  return context
}
