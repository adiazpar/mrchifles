'use client'

import { useRef } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

interface LottiePlayerProps {
  src: string
  loop?: boolean
  autoplay?: boolean
  speed?: number
  className?: string
  style?: React.CSSProperties
  onComplete?: () => void
}

export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  className,
  style,
  onComplete
}: LottiePlayerProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const hasCalledComplete = useRef(false)

  // Convert .lottie paths to .json paths
  const jsonPath = src.replace(/\.lottie$/, '.json')

  const handleComplete = () => {
    if (hasCalledComplete.current) return
    hasCalledComplete.current = true
    onComplete?.()
  }

  return (
    <Lottie
      lottieRef={lottieRef}
      path={jsonPath}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
      onComplete={handleComplete}
      rendererSettings={{
        preserveAspectRatio: 'xMidYMid slice'
      }}
    />
  )
}
