import { useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"

export default function Loader() {
  const [progress, setProgress] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Loading messages
  const loadingMessages = [
    "Just a moment, we're getting things ready...",
    "Almost there, hang tight!",
    "Brewing some magic for you...",
    "The best things are worth waiting for...",
    "Gathering all the awesome stuff...",
    "Just putting on the finishing touches...",
    "We're working our digital magic...",
    "Your experience is being crafted...",
    "Just a few more seconds of patience...",
    "You're going to love what's coming...",
  ]

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setIsComplete(true)
          return 100
        }
        return prev + 1
      })
    }, 80)

    // Message changing animation
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 2500)

    return () => {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center bg-white text-black text-center px-4 z-50 min-h-screen">
      {/* Animated Text */}
      <div className="h-20 flex items-center justify-center mb-6 overflow-hidden">
        <h3 key={messageIndex} className="text-xl font-medium text-black/80 animate-fadeIn">
          {isComplete ? "Ready!" : loadingMessages[messageIndex]}
        </h3>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full max-w-md mx-auto mb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="flex justify-between items-center text-sm text-gray-500 font-mono mb-8 w-full max-w-md">
        <span>Loading</span>
        <span>{progress}%</span>
      </div>

      {/* Success Message */}
      {isComplete && (
        <div className="mt-6 animate-fadeIn">
          <div className="text-xl font-medium text-primary flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>You've arrived! Welcome.</span>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in forwards;
        }
      `}</style>
    </div>
  )
}

