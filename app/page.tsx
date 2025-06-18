"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Play,
  Pause,
  RotateCcw,
  Power,
  ChevronRight,
  Volume2,
  VolumeX,
  Music,
  Music2,
  Info,
  Menu,
  X,
  Users,
} from "lucide-react"

// First, add the import for the multiplayer context and components
import { MultiplayerProvider, useMultiplayer } from "@/contexts/multiplayer-context"
import { MultiplayerModal } from "@/components/multiplayer-modal"
import { MultiplayerLobby } from "@/components/multiplayer-lobby"

interface GameState {
  health: number
  credits: number
  wave: number
  score: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
}

interface Tower {
  x: number
  y: number
  type: "laser" | "plasma" | "quantum"
  level: number
  lastShot: number
  range: number
  damage: number
  cost: number
}

interface Enemy {
  x: number
  y: number
  health: number
  maxHealth: number
  speed: number
  value: number
  type: "virus" | "malware" | "trojan"
  pathIndex: number
}

interface Projectile {
  x: number
  y: number
  targetX: number
  targetY: number
  damage: number
  speed: number
  type: string
}

interface AudioSettings {
  soundEnabled: boolean
  musicEnabled: boolean
}

const TOWER_TYPES = {
  laser: { damage: 25, range: 80, cost: 50, color: "#3b82f6", name: "Laser Node" },
  plasma: { damage: 45, range: 60, cost: 100, color: "#06b6d4", name: "Plasma Core" },
  quantum: { damage: 80, range: 100, cost: 200, color: "#8b5cf6", name: "Quantum Gate" },
}

const ENEMY_TYPES = {
  virus: { health: 50, speed: 2, value: 10, color: "#ef4444", size: 8 },
  malware: { health: 100, speed: 1.5, value: 20, color: "#f97316", size: 10 },
  trojan: { health: 200, speed: 1, value: 40, color: "#dc2626", size: 12 },
}

// Multiple path patterns for variety
const PATH_PATTERNS = [
  // Pattern 1: Zigzag
  [
    { x: 0, y: 200 },
    { x: 150, y: 200 },
    { x: 150, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 450, y: 300 },
    { x: 450, y: 150 },
    { x: 600, y: 150 },
    { x: 600, y: 250 },
    { x: 750, y: 250 },
  ],
  // Pattern 2: Spiral
  [
    { x: 0, y: 350 },
    { x: 200, y: 350 },
    { x: 200, y: 100 },
    { x: 600, y: 100 },
    { x: 600, y: 300 },
    { x: 300, y: 300 },
    { x: 300, y: 200 },
    { x: 500, y: 200 },
    { x: 500, y: 250 },
    { x: 400, y: 250 },
  ],
  // Pattern 3: S-curve
  [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 300, y: 200 },
    { x: 400, y: 300 },
    { x: 500, y: 200 },
    { x: 600, y: 100 },
    { x: 750, y: 200 },
  ],
  // Pattern 4: L-shape
  [
    { x: 0, y: 300 },
    { x: 300, y: 300 },
    { x: 300, y: 100 },
    { x: 500, y: 100 },
    { x: 500, y: 350 },
    { x: 700, y: 350 },
    { x: 700, y: 200 },
  ],
  // Pattern 5: Double bend
  [
    { x: 0, y: 150 },
    { x: 150, y: 150 },
    { x: 250, y: 250 },
    { x: 350, y: 150 },
    { x: 450, y: 250 },
    { x: 550, y: 150 },
    { x: 650, y: 250 },
    { x: 750, y: 150 },
  ],
]

// localStorage functions for recent activities
const saveActivity = (activity: { type: string; message: string; timestamp: number }) => {
  try {
    const activities = getRecentActivities()
    activities.unshift(activity)
    // Keep only last 10 activities
    const trimmedActivities = activities.slice(0, 10)
    localStorage.setItem("nexus-activities", JSON.stringify(trimmedActivities))
  } catch (error) {
    console.log("Error saving activity:", error)
  }
}

const getRecentActivities = () => {
  try {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem("nexus-activities")
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.log("Error getting activities:", error)
    return []
  }
}

// Function to get random path
const getRandomPath = () => {
  const randomIndex = Math.floor(Math.random() * PATH_PATTERNS.length)
  return PATH_PATTERNS[randomIndex]
}

// Audio settings functions
const saveAudioSettings = (settings: AudioSettings) => {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem("nexus-audio-settings", JSON.stringify(settings))
  } catch (error) {
    console.log("Error saving audio settings:", error)
  }
}

const getAudioSettings = (): AudioSettings => {
  try {
    if (typeof window === "undefined") return { soundEnabled: true, musicEnabled: true }
    const stored = localStorage.getItem("nexus-audio-settings")
    return stored ? JSON.parse(stored) : { soundEnabled: true, musicEnabled: true }
  } catch (error) {
    console.log("Error getting audio settings:", error)
    return { soundEnabled: true, musicEnabled: true }
  }
}

// Modified MultiplayerWrapper component to pass the modal state to NexusNetworkDefense
function MultiplayerWrapper() {
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false)
  const { multiplayerState } = useMultiplayer()
  const [audioInitialized, setAudioInitialized] = useState(false)
  const multiplayerSoundRef = useRef<HTMLAudioElement | null>(null)
  const multiplayerMusicRef = useRef<HTMLAudioElement | null>(null)
  const [audioSettings, setAudioSettings] = useState<{ soundEnabled: boolean; musicEnabled: boolean }>({
    soundEnabled: true,
    musicEnabled: true,
  })

  // Initialize multiplayer audio
  useEffect(() => {
    try {
      if (!audioInitialized) {
        // Load saved audio settings
        const savedSettings = getAudioSettings()
        setAudioSettings(savedSettings)

        // Initialize sound effect
        multiplayerSoundRef.current = new Audio("/button-click.mp3")
        if (multiplayerSoundRef.current) {
          multiplayerSoundRef.current.volume = 0.6
        }

        // Initialize background music
        multiplayerMusicRef.current = new Audio("/background-music.mp3")
        if (multiplayerMusicRef.current) {
          multiplayerMusicRef.current.loop = true
          multiplayerMusicRef.current.volume = 0.3
        }

        setAudioInitialized(true)
      }
    } catch (error) {
      console.log("Error initializing multiplayer audio:", error)
    }

    return () => {
      try {
        if (multiplayerSoundRef.current) {
          multiplayerSoundRef.current.pause()
          multiplayerSoundRef.current = null
        }
        if (multiplayerMusicRef.current) {
          multiplayerMusicRef.current.pause()
          multiplayerMusicRef.current = null
        }
      } catch (error) {
        console.log("Error cleaning up multiplayer audio:", error)
      }
    }
  }, [audioInitialized])

  // Play/pause background music when modal is shown/hidden
  useEffect(() => {
    try {
      if (multiplayerMusicRef.current) {
        if (
          (showMultiplayerModal || (multiplayerState.roomId && !multiplayerState.gameStarted)) &&
          audioSettings.musicEnabled
        ) {
          multiplayerMusicRef.current.play().catch((e) => console.log("Music play prevented:", e))
        } else {
          multiplayerMusicRef.current.pause()
        }
      }
    } catch (error) {
      console.log("Error handling multiplayer music:", error)
    }
  }, [showMultiplayerModal, multiplayerState.roomId, multiplayerState.gameStarted, audioSettings.musicEnabled])

  // Play sound when opening modal
  const handleOpenModal = () => {
    try {
      if (multiplayerSoundRef.current && audioSettings.soundEnabled) {
        multiplayerSoundRef.current.currentTime = 0
        multiplayerSoundRef.current.play().catch((e) => console.log("Audio play prevented:", e))
      }
    } catch (error) {
      console.log("Error playing multiplayer sound:", error)
    }
    setShowMultiplayerModal(true)
  }

  // Play sound when closing modal
  const handleCloseModal = () => {
    try {
      if (multiplayerSoundRef.current && audioSettings.soundEnabled) {
        multiplayerSoundRef.current.currentTime = 0
        multiplayerSoundRef.current.play().catch((e) => console.log("Audio play prevented:", e))
      }
    } catch (error) {
      console.log("Error playing multiplayer sound:", error)
    }
    setShowMultiplayerModal(false)
  }

  return (
    <>
      <NexusNetworkDefense onOpenMultiplayerModal={handleOpenModal} />

      {showMultiplayerModal && !multiplayerState.roomId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <MultiplayerModal onClose={handleCloseModal} />
        </div>
      )}

      {multiplayerState.roomId && !multiplayerState.gameStarted && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <MultiplayerLobby onBack={handleCloseModal} />
        </div>
      )}
    </>
  )
}

// Updated NexusNetworkDefense to accept the onOpenMultiplayerModal prop
function NexusNetworkDefense({ onOpenMultiplayerModal }: { onOpenMultiplayerModal: () => void }) {
  const { multiplayerState, syncGameState, getGameState, endTurn } = useMultiplayer()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)

  // Sound effect references
  const soundEffects = useRef<{ [key: string]: HTMLAudioElement | null }>({
    towerPlace: null,
    shoot: null,
    enemyDeath: null,
    waveComplete: null,
    gameOver: null,
    buttonClick: null,
  })

  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    credits: 150,
    wave: 1,
    score: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
  })

  const [selectedTower, setSelectedTower] = useState<keyof typeof TOWER_TYPES>("laser")
  const [towers, setTowers] = useState<Tower[]>([])
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [lastWaveSpawn, setLastWaveSpawn] = useState(0)
  const [enemiesInWave, setEnemiesInWave] = useState(0)
  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; message: string; timestamp: number }>>(
    [],
  )
  const [gamePath, setGamePath] = useState(getRandomPath())
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({ soundEnabled: true, musicEnabled: true })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const screenWidth = window.innerWidth
      if (screenWidth < 640) {
        // Mobile
        setCanvasSize({ width: screenWidth - 40, height: (screenWidth - 40) * 0.5 })
      } else if (screenWidth < 1024) {
        // Tablet
        setCanvasSize({ width: screenWidth - 100, height: (screenWidth - 100) * 0.5 })
      } else {
        // Desktop
        setCanvasSize({ width: 800, height: 400 })
      }
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [])

  // Scale path coordinates based on canvas size
  const getScaledPath = () => {
    const scaleX = canvasSize.width / 800
    const scaleY = canvasSize.height / 400
    return gamePath.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }))
  }

  // Initialize audio
  useEffect(() => {
    try {
      // Load saved audio settings
      setAudioSettings(getAudioSettings())

      // Create audio elements
      backgroundMusicRef.current = new Audio("/background-music.mp3")
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.loop = true
        backgroundMusicRef.current.volume = 0.4
      }

      soundEffects.current.towerPlace = new Audio("/tower-place.mp3")
      soundEffects.current.shoot = new Audio("/shoot.mp3")
      soundEffects.current.enemyDeath = new Audio("/enemy-death.mp3")
      soundEffects.current.waveComplete = new Audio("/wave-complete.mp3")
      soundEffects.current.gameOver = new Audio("/game-over.mp3")
      soundEffects.current.buttonClick = new Audio("/button-click.mp3")

      // Set volume for all sound effects
      Object.values(soundEffects.current).forEach((sound) => {
        if (sound) sound.volume = 0.6
      })
    } catch (error) {
      console.log("Error initializing audio:", error)
    }

    return () => {
      // Cleanup audio
      try {
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.pause()
          backgroundMusicRef.current = null
        }

        Object.keys(soundEffects.current).forEach((key) => {
          soundEffects.current[key] = null
        })
      } catch (error) {
        console.log("Error cleaning up audio:", error)
      }
    }
  }, [])

  // Handle audio settings changes
  useEffect(() => {
    try {
      if (backgroundMusicRef.current) {
        if (audioSettings.musicEnabled && gameState.isPlaying && !gameState.isPaused) {
          backgroundMusicRef.current.play().catch((e) => console.log("Audio play prevented:", e))
        } else {
          backgroundMusicRef.current.pause()
        }
      }

      // Save settings to localStorage
      saveAudioSettings(audioSettings)
    } catch (error) {
      console.log("Error handling audio settings:", error)
    }
  }, [audioSettings, gameState.isPlaying, gameState.isPaused])

  // Play sound effect helper
  const playSound = (soundName: keyof typeof soundEffects.current) => {
    try {
      if (!audioSettings.soundEnabled) return

      const sound = soundEffects.current[soundName]
      if (sound) {
        sound.currentTime = 0
        sound.play().catch((e) => console.log("Audio play prevented:", e))
      }
    } catch (error) {
      console.log("Error playing sound:", error)
    }
  }

  const resetGame = () => {
    playSound("buttonClick")

    const newPath = getRandomPath()
    setGamePath(newPath)

    setGameState({
      health: 100,
      credits: 150,
      wave: 1,
      score: 0,
      isPlaying: false,
      isPaused: false,
      gameOver: false,
    })
    setTowers([])
    setEnemies([])
    setProjectiles([])
    setLastWaveSpawn(0)
    setEnemiesInWave(0)

    const activity = {
      type: "System",
      message: "Defense system reset - New path generated",
      timestamp: Date.now(),
    }
    saveActivity(activity)
    setRecentActivities(getRecentActivities())
  }

  // Add a function to handle multiplayer game state synchronization
  const syncMultiplayerState = () => {
    if (multiplayerState.isMultiplayer && multiplayerState.gameStarted) {
      // Only sync if it's your turn
      if (multiplayerState.playerTurn === multiplayerState.playerId) {
        syncGameState({
          health: gameState.health,
          credits: gameState.credits,
          wave: gameState.wave,
          score: gameState.score,
          towers: towers,
          enemies: enemies,
          projectiles: projectiles,
          lastWaveSpawn,
          enemiesInWave,
          gamePath,
        })
      } else {
        // If it's not your turn, get opponent's state
        const opponentState = getGameState()
        if (opponentState) {
          setGameState({
            ...gameState,
            health: opponentState.health,
            credits: opponentState.credits,
            wave: opponentState.wave,
            score: opponentState.score,
          })
          setTowers(opponentState.towers || [])
          setEnemies(opponentState.enemies || [])
          setProjectiles(opponentState.projectiles || [])
          setLastWaveSpawn(opponentState.lastWaveSpawn || 0)
          setEnemiesInWave(opponentState.enemiesInWave || 0)
          setGamePath(opponentState.gamePath || getRandomPath())
        }
      }
    }
  }

  // Add this effect to handle multiplayer state synchronization
  useEffect(() => {
    if (multiplayerState.isMultiplayer && multiplayerState.gameStarted) {
      const syncInterval = setInterval(syncMultiplayerState, 1000)
      return () => clearInterval(syncInterval)
    }
  }, [multiplayerState.isMultiplayer, multiplayerState.gameStarted, multiplayerState.playerTurn])

  const spawnEnemy = (type: keyof typeof ENEMY_TYPES) => {
    const scaledPath = getScaledPath()
    const enemyType = ENEMY_TYPES[type]
    const newEnemy: Enemy = {
      x: scaledPath[0].x,
      y: scaledPath[0].y,
      health: enemyType.health + (gameState.wave - 1) * 10,
      maxHealth: enemyType.health + (gameState.wave - 1) * 10,
      speed: enemyType.speed,
      value: enemyType.value,
      type,
      pathIndex: 0,
    }
    setEnemies((prev) => [...prev, newEnemy])
  }

  // Modify the placeTower function to check for multiplayer turn
  const placeTower = (x: number, y: number) => {
    if (!gameState.isPlaying || gameState.isPaused) return

    // In multiplayer mode, only allow placing towers on your turn
    if (multiplayerState.isMultiplayer && multiplayerState.playerTurn !== multiplayerState.playerId) {
      return
    }

    const towerType = TOWER_TYPES[selectedTower]
    if (gameState.credits < towerType.cost) return

    const scaledPath = getScaledPath()
    const scaleX = canvasSize.width / 800
    const scaleY = canvasSize.height / 400

    // Check if position is valid (not on path, not too close to other towers)
    const tooClose = towers.some((tower) => Math.sqrt((tower.x - x) ** 2 + (tower.y - y) ** 2) < 40 * scaleX)
    const onPath = scaledPath.some((point) => Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < 30 * scaleX)

    if (tooClose || onPath) return

    const newTower: Tower = {
      x,
      y,
      type: selectedTower,
      level: 1,
      lastShot: 0,
      range: towerType.range * scaleX,
      damage: towerType.damage,
      cost: towerType.cost,
    }

    setTowers((prev) => [...prev, newTower])
    setGameState((prev) => ({ ...prev, credits: prev.credits - towerType.cost }))

    playSound("towerPlace")

    const activity = {
      type: "Defense",
      message: `${towerType.name} deployed`,
      timestamp: Date.now(),
    }
    saveActivity(activity)
    setRecentActivities(getRecentActivities())
  }

  // Add a function to handle turn end in multiplayer
  const handleEndTurn = () => {
    if (multiplayerState.isMultiplayer && multiplayerState.gameStarted) {
      syncGameState({
        health: gameState.health,
        credits: gameState.credits,
        wave: gameState.wave,
        score: gameState.score,
        towers: towers,
        enemies: enemies,
        projectiles: projectiles,
        lastWaveSpawn,
        enemiesInWave,
        gamePath,
      })
      endTurn()
    }
  }

  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas || !gameState.isPlaying || gameState.isPaused || gameState.gameOver) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scaledPath = getScaledPath()
    const scaleX = canvasSize.width / 800
    const scaleY = canvasSize.height / 400

    // Clear canvas with dark background
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw subtle grid
    ctx.strokeStyle = "#1f1f1f"
    ctx.lineWidth = 1
    for (let i = 0; i < canvas.width; i += 40 * scaleX) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 40 * scaleY) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // Draw path
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 20 * scaleX
    ctx.beginPath()
    ctx.moveTo(scaledPath[0].x, scaledPath[0].y)
    scaledPath.forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.stroke()

    // Draw Nexus core with blue glow
    const coreX = scaledPath[scaledPath.length - 1].x
    const coreY = scaledPath[scaledPath.length - 1].y
    ctx.fillStyle = "#3b82f6"
    ctx.shadowColor = "#3b82f6"
    ctx.shadowBlur = 30 * scaleX
    ctx.beginPath()
    ctx.arc(coreX, coreY, 25 * scaleX, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Spawn enemies
    if (timestamp - lastWaveSpawn > 1000 && enemiesInWave < gameState.wave * 5) {
      const enemyTypes = Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]
      const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
      spawnEnemy(randomType)
      setLastWaveSpawn(timestamp)
      setEnemiesInWave((prev) => prev + 1)
    }

    // Update enemies
    setEnemies((prevEnemies) => {
      return prevEnemies
        .map((enemy) => {
          if (enemy.pathIndex < scaledPath.length - 1) {
            const target = scaledPath[enemy.pathIndex + 1]
            const dx = target.x - enemy.x
            const dy = target.y - enemy.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 5 * scaleX) {
              enemy.pathIndex++
            } else {
              enemy.x += (dx / distance) * enemy.speed * scaleX
              enemy.y += (dy / distance) * enemy.speed * scaleY
            }
          } else {
            // Enemy reached the core - GAME OVER
            triggerGameOver()
            return null
          }
          return enemy
        })
        .filter(Boolean) as Enemy[]
    })

    // Tower shooting logic
    setProjectiles((prevProjectiles) => {
      const newProjectiles = [...prevProjectiles]

      towers.forEach((tower) => {
        if (timestamp - tower.lastShot > 500) {
          const nearestEnemy = enemies.find((enemy) => {
            const distance = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2)
            return distance <= tower.range
          })

          if (nearestEnemy) {
            newProjectiles.push({
              x: tower.x,
              y: tower.y,
              targetX: nearestEnemy.x,
              targetY: nearestEnemy.y,
              damage: tower.damage,
              speed: 8 * scaleX,
              type: tower.type,
            })
            tower.lastShot = timestamp

            // Play shooting sound (throttled to avoid too many sounds)
            if (Math.random() > 0.7) {
              playSound("shoot")
            }
          }
        }
      })

      return newProjectiles
    })

    // Update projectiles
    setProjectiles((prevProjectiles) => {
      return prevProjectiles
        .map((projectile) => {
          const dx = projectile.targetX - projectile.x
          const dy = projectile.targetY - projectile.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < projectile.speed) {
            // Hit target
            setEnemies((prevEnemies) => {
              return prevEnemies
                .map((enemy) => {
                  const enemyDistance = Math.sqrt(
                    (enemy.x - projectile.targetX) ** 2 + (enemy.y - projectile.targetY) ** 2,
                  )
                  if (enemyDistance < 20 * scaleX) {
                    enemy.health -= projectile.damage
                    if (enemy.health <= 0) {
                      setGameState((prev) => ({
                        ...prev,
                        credits: prev.credits + enemy.value,
                        score: prev.score + enemy.value * 10,
                      }))

                      // Play enemy death sound (throttled)
                      if (Math.random() > 0.5) {
                        playSound("enemyDeath")
                      }

                      return null
                    }
                  }
                  return enemy
                })
                .filter(Boolean) as Enemy[]
            })
            return null
          } else {
            projectile.x += (dx / distance) * projectile.speed
            projectile.y += (dy / distance) * projectile.speed
            return projectile
          }
        })
        .filter(Boolean) as Projectile[]
    })

    // Draw towers
    towers.forEach((tower) => {
      const towerType = TOWER_TYPES[tower.type]
      ctx.fillStyle = towerType.color
      ctx.shadowColor = towerType.color
      ctx.shadowBlur = 15 * scaleX
      ctx.beginPath()
      ctx.arc(tower.x, tower.y, 15 * scaleX, 0, Math.PI * 2)
      ctx.fill()

      // Draw range when selected
      if (selectedTower === tower.type) {
        ctx.strokeStyle = towerType.color + "40"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
    })

    // Draw enemies
    enemies.forEach((enemy) => {
      const enemyType = ENEMY_TYPES[enemy.type]
      ctx.fillStyle = enemyType.color
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemyType.size * scaleX, 0, Math.PI * 2)
      ctx.fill()

      // Health bar
      const barWidth = 20 * scaleX
      const barHeight = 4 * scaleY
      ctx.fillStyle = "#374151"
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemyType.size * scaleX - 8 * scaleY, barWidth, barHeight)
      ctx.fillStyle = "#3b82f6"
      ctx.fillRect(
        enemy.x - barWidth / 2,
        enemy.y - enemyType.size * scaleX - 8 * scaleY,
        (enemy.health / enemy.maxHealth) * barWidth,
        barHeight,
      )
    })

    // Draw projectiles
    projectiles.forEach((projectile) => {
      const towerType = TOWER_TYPES[projectile.type as keyof typeof TOWER_TYPES]
      ctx.fillStyle = towerType.color
      ctx.shadowColor = towerType.color
      ctx.shadowBlur = 10 * scaleX
      ctx.beginPath()
      ctx.arc(projectile.x, projectile.y, 3 * scaleX, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })

    // Check wave completion
    if (enemies.length === 0 && enemiesInWave >= gameState.wave * 5) {
      setGameState((prev) => ({
        ...prev,
        wave: prev.wave + 1,
        credits: prev.credits + 50,
      }))
      setEnemiesInWave(0)

      playSound("waveComplete")

      const activity = {
        type: "Wave",
        message: `Wave ${gameState.wave} completed`,
        timestamp: Date.now(),
      }
      saveActivity(activity)
      setRecentActivities(getRecentActivities())
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }

  // Game over function
  const triggerGameOver = () => {
    if (gameState.gameOver) return

    setGameState((prev) => ({ ...prev, gameOver: true, isPlaying: false }))
    playSound("gameOver")

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause()
    }

    const activity = {
      type: "Alert",
      message: `Nexus compromised - Score: ${gameState.score}`,
      timestamp: Date.now(),
    }
    saveActivity(activity)
    setRecentActivities(getRecentActivities())
  }

  useEffect(() => {
    try {
      if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
        animationRef.current = requestAnimationFrame(gameLoop)

        // Start music if enabled
        if (audioSettings.musicEnabled && backgroundMusicRef.current) {
          backgroundMusicRef.current.play().catch((e) => console.log("Audio play prevented:", e))
        }
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }

        // Pause music
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.pause()
        }
      }
    } catch (error) {
      console.log("Error in game loop effect:", error)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, towers, enemies, projectiles])

  useEffect(() => {
    try {
      setRecentActivities(getRecentActivities())
    } catch (error) {
      console.log("Error loading activities:", error)
    }
  }, [])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      let x: number, y: number

      if ("touches" in event) {
        // Touch event
        const touch = event.touches[0] || event.changedTouches[0]
        x = touch.clientX - rect.left
        y = touch.clientY - rect.top
      } else {
        // Mouse event
        x = event.clientX - rect.left
        y = event.clientY - rect.top
      }

      placeTower(x, y)
    } catch (error) {
      console.log("Error handling canvas click:", error)
    }
  }

  const startGame = () => {
    playSound("buttonClick")

    setGameState((prev) => ({ ...prev, isPlaying: true }))

    const activity = {
      type: "System",
      message: "Defense system activated",
      timestamp: Date.now(),
    }
    saveActivity(activity)
    setRecentActivities(getRecentActivities())
  }

  const toggleSound = () => {
    playSound("buttonClick")
    setAudioSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
  }

  const toggleMusic = () => {
    playSound("buttonClick")
    setAudioSettings((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }))
  }

  const openInfoDialog = () => {
    playSound("buttonClick")
    setIsDialogOpen(true)
  }

  // Handle multiplayer button click
  const handleMultiplayerClick = () => {
    playSound("buttonClick")
    onOpenMultiplayerModal()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg lg:text-xl font-light tracking-wider">NEXUS</h1>
            <span className="text-xs lg:text-sm text-gray-400">Network Defense</span>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-300">Online</span>
            </div>

            {/* Multiplayer Button - Updated to use the passed function */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden"
              title="Multiplayer"
              onClick={handleMultiplayerClick}
            >
              <Users className="h-4 w-4 text-blue-400" />
            </Button>

            {/* How to Play Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="How to Play" onClick={openInfoDialog}>
                  <Info className="h-4 w-4 text-blue-400" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-blue-400 mb-4">How to Play Nexus Network Defense</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 text-sm pr-4">
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      🎯 <span className="ml-2">Objective</span>
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Protect the Nexus core (blue glowing orb) from cyber threats. If any enemy reaches the core, the
                      game is over immediately! Your mission is to strategically place defense nodes to eliminate all
                      threats.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      🏗️ <span className="ml-2">Building Defense Nodes</span>
                    </h3>
                    <ul className="space-y-2 text-gray-300 leading-relaxed">
                      <li>• Select a defense node type from the panel below the stats</li>
                      <li>• Click/tap on the grid to place towers (avoid the dark path)</li>
                      <li>• Cannot place on the enemy path or too close to other towers</li>
                      <li>• Each tower costs credits - manage your resources wisely</li>
                      <li>• Towers automatically target and shoot at nearby enemies</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      🛡️ <span className="ml-2">Defense Node Types</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/30">
                        <div className="text-blue-400 font-semibold text-base mb-2">Laser Node</div>
                        <div className="text-sm text-gray-400 mb-2">Cost: 50 Credits</div>
                        <div className="text-sm text-gray-400 mb-2">Damage: 25 | Range: 80</div>
                        <div className="text-sm text-gray-300">
                          Fast firing, affordable basic defense. Great for early waves.
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg border border-cyan-500/30">
                        <div className="text-cyan-400 font-semibold text-base mb-2">Plasma Core</div>
                        <div className="text-sm text-gray-400 mb-2">Cost: 100 Credits</div>
                        <div className="text-sm text-gray-400 mb-2">Damage: 45 | Range: 60</div>
                        <div className="text-sm text-gray-300">Balanced power and range. Solid mid-game choice.</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg border border-purple-500/30">
                        <div className="text-purple-400 font-semibold text-base mb-2">Quantum Gate</div>
                        <div className="text-sm text-gray-400 mb-2">Cost: 200 Credits</div>
                        <div className="text-sm text-gray-400 mb-2">Damage: 80 | Range: 100</div>
                        <div className="text-sm text-gray-300">
                          Ultimate high-damage defense. Perfect for tough enemies.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      👾 <span className="ml-2">Enemy Types</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg border border-red-500/30">
                        <div className="text-red-400 font-semibold text-base mb-2">Virus</div>
                        <div className="text-sm text-gray-400 mb-2">Health: 50 | Speed: Fast</div>
                        <div className="text-sm text-gray-400 mb-2">Reward: 10 Credits</div>
                        <div className="text-sm text-gray-300">
                          Quick but weak. Easy to eliminate with basic defenses.
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg border border-orange-500/30">
                        <div className="text-orange-400 font-semibold text-base mb-2">Malware</div>
                        <div className="text-sm text-gray-400 mb-2">Health: 100 | Speed: Medium</div>
                        <div className="text-sm text-gray-400 mb-2">Reward: 20 Credits</div>
                        <div className="text-sm text-gray-300">
                          Balanced threat. Requires focused fire to eliminate.
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg border border-red-600/30">
                        <div className="text-red-600 font-semibold text-base mb-2">Trojan</div>
                        <div className="text-sm text-gray-400 mb-2">Health: 200 | Speed: Slow</div>
                        <div className="text-sm text-gray-400 mb-2">Reward: 40 Credits</div>
                        <div className="text-sm text-gray-300">
                          Heavily armored. Needs multiple towers or high-damage nodes.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      🎮 <span className="ml-2">Controls</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-white font-semibold mb-2">Desktop Controls</div>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Click to place towers</li>
                          <li>• Use power button to start/pause</li>
                          <li>• Select tower type before placing</li>
                        </ul>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-white font-semibold mb-2">Mobile Controls</div>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Tap to place towers</li>
                          <li>• Use hamburger menu for sidebar</li>
                          <li>• Touch-friendly interface</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      💡 <span className="ml-2">Strategy Tips</span>
                    </h3>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li>
                          • <strong>Positioning:</strong> Place towers at path corners for maximum coverage
                        </li>
                        <li>
                          • <strong>Diversity:</strong> Mix different tower types for balanced defense
                        </li>
                        <li>
                          • <strong>Economy:</strong> Save credits for stronger waves - they get harder!
                        </li>
                        <li>
                          • <strong>Progression:</strong> Each wave spawns more enemies than the last
                        </li>
                        <li>
                          • <strong>Variety:</strong> The path changes randomly each game for replayability
                        </li>
                        <li>
                          • <strong>Focus Fire:</strong> Multiple towers targeting the same area are very effective
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                      📊 <span className="ml-2">Scoring & Progression</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-white font-semibold mb-2">Credits System</div>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Earn credits by destroying enemies</li>
                          <li>• Bonus credits for completing waves</li>
                          <li>• Spend credits on defense nodes</li>
                        </ul>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-white font-semibold mb-2">Scoring</div>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Score increases based on enemy value</li>
                          <li>• Higher waves = more points</li>
                          <li>• Survive as long as possible!</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/50">
                    <div className="text-blue-300 font-semibold mb-2 flex items-center">
                      ⚠️ <span className="ml-2">Remember</span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      If ANY enemy reaches the Nexus core, the game ends immediately! Plan your defenses carefully and
                      don't let any threats slip through.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Audio Controls */}
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleSound}
                title={audioSettings.soundEnabled ? "Mute Sound" : "Enable Sound"}
              >
                {audioSettings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-blue-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-500" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMusic}
                title={audioSettings.musicEnabled ? "Mute Music" : "Enable Music"}
              >
                {audioSettings.musicEnabled ? (
                  <Music2 className="h-4 w-4 text-blue-400" />
                ) : (
                  <Music className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Game Area */}
          <div className="flex-1 p-4 lg:p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 text-center">
                  <div className="text-xs lg:text-sm text-gray-400 mb-1">System Health</div>
                  <div className="text-lg lg:text-2xl font-light">{gameState.health}%</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 text-center">
                  <div className="text-xs lg:text-sm text-gray-400 mb-1">Credits</div>
                  <div className="text-lg lg:text-2xl font-light">{gameState.credits}</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 text-center">
                  <div className="text-xs lg:text-sm text-gray-400 mb-1">Wave</div>
                  <div className="text-lg lg:text-2xl font-light">{gameState.wave}</div>
                </CardContent>
              </Card>
            </div>

            {/* Multiplayer Status */}
            {multiplayerState.isMultiplayer && multiplayerState.gameStarted && (
              <Card className="bg-gray-900/50 border-gray-800 mb-4 lg:mb-6">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs lg:text-sm text-gray-300">Multiplayer Mode</span>
                      <div className="flex items-center mt-1">
                        <span className="text-sm font-medium mr-2">
                          {multiplayerState.playerTurn === multiplayerState.playerId ? "Your Turn" : "Opponent's Turn"}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            multiplayerState.playerTurn === multiplayerState.playerId ? "bg-green-500" : "bg-red-500"
                          }`}
                        ></div>
                      </div>
                    </div>

                    {multiplayerState.playerTurn === multiplayerState.playerId && (
                      <Button onClick={handleEndTurn} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        End Turn
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Defense Nodes Selection */}
            <Card className="bg-gray-900/50 border-gray-800 mb-4 lg:mb-6">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs lg:text-sm text-gray-300">Defense Nodes</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
                <div className="grid grid-cols-3 gap-2 lg:gap-3">
                  {Object.entries(TOWER_TYPES).map(([key, tower]) => (
                    <Button
                      key={key}
                      variant={selectedTower === key ? "default" : "outline"}
                      className={`h-12 lg:h-16 flex flex-col items-center justify-center space-y-1 text-xs ${
                        selectedTower === key
                          ? "bg-blue-600 hover:bg-blue-700 border-blue-500"
                          : "bg-gray-800 hover:bg-gray-700 border-gray-700"
                      }`}
                      onClick={() => {
                        playSound("buttonClick")
                        setSelectedTower(key as keyof typeof TOWER_TYPES)
                      }}
                      disabled={gameState.credits < tower.cost}
                    >
                      <div className="font-light">{tower.name}</div>
                      <div className="text-gray-400">{tower.cost}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Game Canvas */}
            <Card className="bg-gray-900/50 border-gray-800 mb-4 lg:mb-6">
              <CardContent className="p-2 lg:p-4">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="w-full border border-gray-700 rounded cursor-crosshair touch-none"
                  onClick={handleCanvasClick}
                  onTouchEnd={handleCanvasClick}
                />
                {gameState.gameOver && (
                  <div className="absolute inset-0 bg-black/90 flex items-center justify-center rounded">
                    <div className="text-center p-4">
                      <h2 className="text-xl lg:text-2xl font-light text-red-400 mb-4">NEXUS COMPROMISED</h2>
                      <p className="text-gray-300 mb-4">Final Score: {gameState.score}</p>
                      <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700">
                        Restart Defense
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Control Panel */}
            <div className="grid grid-cols-3 gap-2 lg:gap-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 text-center">
                  <div className="text-sm lg:text-lg font-light">{gameState.score}</div>
                  <div className="text-xs text-gray-400">Score</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 flex items-center justify-center">
                  {!gameState.isPlaying ? (
                    <Button
                      onClick={startGame}
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-blue-600 hover:bg-blue-700 p-0"
                    >
                      <Power className="w-5 h-5 lg:w-6 lg:h-6" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        playSound("buttonClick")
                        setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
                      }}
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-blue-600 hover:bg-blue-700 p-0"
                    >
                      {gameState.isPaused ? (
                        <Play className="w-5 h-5 lg:w-6 lg:h-6" />
                      ) : (
                        <Pause className="w-5 h-5 lg:w-6 lg:h-6" />
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-2 lg:p-4 text-center">
                  <div className="text-sm lg:text-lg font-light">{enemies.length}</div>
                  <div className="text-xs text-gray-400">Threats</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Sidebar - Recent Activity */}
          <div
            className={`${sidebarOpen ? "block" : "hidden"} lg:block w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-800 p-4 lg:p-6`}
          >
            <div className="space-y-4">
              <div className="text-sm text-gray-400 mb-4">Recent Activity</div>

              <div className="space-y-3 max-h-60 lg:max-h-none overflow-y-auto">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="text-xs">
                    <div className="text-white">{activity.type}</div>
                    <div className="text-gray-400">{activity.message}</div>
                    <div className="text-gray-500 text-xs">{new Date(activity.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
                {recentActivities.length === 0 && <div className="text-xs text-gray-500">No recent activity</div>}
              </div>

              <div className="mt-8">
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="w-full bg-gray-800 hover:bg-gray-700 border-gray-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Defense
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modify the export default to wrap the component with MultiplayerProvider
export default function Page() {
  return (
    <MultiplayerProvider>
      <MultiplayerWrapper />
    </MultiplayerProvider>
  )
}
