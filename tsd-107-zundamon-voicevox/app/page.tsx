import VoiceGenerator from '@/components/VoiceGenerator'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zundamon-light to-white">
      <div className="container mx-auto px-4 py-8">
        <VoiceGenerator />
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-sm text-gray-500 space-y-4">
        <p>Powered by VOICEVOX</p>

        {/* Terms of Use */}
        <div className="space-y-2">
          <p className="font-semibold">利用規約</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://voicevox.hiroshiba.jp/term/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700 transition-colors"
            >
              VOICEVOX利用規約
            </a>
            <a
              href="https://zunko.jp/con_ongen_kiyaku.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700 transition-colors"
            >
              ずんだもん・四国めたん音源利用規約
            </a>
          </div>
        </div>
      </footer>

    </main>
  )
}