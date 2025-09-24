'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  audioBlob: Blob | null
  onReset: () => void
  autoRelease?: boolean  // Auto-release blob after playback
  onReleaseRequest?: () => void  // Callback to notify parent of release
}

export default function AudioPlayer({ audioBlob, onReset, autoRelease = false, onReleaseRequest }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Create URL when blob changes
  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null)
      return
    }

    const url = URL.createObjectURL(audioBlob)
    setAudioUrl(url)

    // Cleanup function
    return () => {
      URL.revokeObjectURL(url)
      if (process.env.NODE_ENV === 'development') {
        console.log('AudioPlayer: Cleaned up audio URL on blob change')
      }
    }
  }, [audioBlob])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        if (process.env.NODE_ENV === 'development') {
          console.log('AudioPlayer: Cleaned up audio URL on unmount')
        }
      }
    }
  }, [])

  if (!audioBlob || !audioUrl) return null

  const handleDownload = () => {
    if (!audioUrl) return
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `voicevox_${Date.now()}.mp3`
    link.click()
  }

  const handlePlaybackEnd = () => {
    setIsPlaying(false)

    if (autoRelease && audioUrl) {
      // Release the URL after playback
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      onReleaseRequest?.()

      if (process.env.NODE_ENV === 'development') {
        console.log('AudioPlayer: Auto-released audio after playback')
      }
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleError = () => {
    setIsPlaying(false)
    console.error('Audio playback error')
  }

  return (
    <div className="bg-zundamon-light rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-bold text-zundamon-dark">音声生成が完了しました！</h3>

      {/* Hidden audio element for tracking playback */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handlePlaybackEnd}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        controls
        className="w-full"
      />

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
          disabled={!audioUrl}
        >
          ダウンロードする
        </button>

        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
        >
          もう一度作る
        </button>
      </div>

      {/* Memory usage indicator in development */}
      {process.env.NODE_ENV === 'development' && isPlaying && (
        <div className="text-xs text-gray-500">
          Audio is playing...
        </div>
      )}
    </div>
  )
}