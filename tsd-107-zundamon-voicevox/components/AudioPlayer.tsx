'use client'

interface AudioPlayerProps {
  audioBlob: Blob | null
  onReset: () => void
}

export default function AudioPlayer({ audioBlob, onReset }: AudioPlayerProps) {
  if (!audioBlob) return null

  const audioUrl = URL.createObjectURL(audioBlob)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `voicevox_${Date.now()}.mp3`
    link.click()
  }

  return (
    <div className="bg-zundamon-light rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-bold text-zundamon-dark">音声生成が完了しました！</h3>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
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
    </div>
  )
}