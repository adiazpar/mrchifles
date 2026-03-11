'use client'

import { useRef, useCallback } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

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
  const hasCalledComplete = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const handleDotLottieRef = useCallback((dotLottie: any) => {
    if (!dotLottie) return

    dotLottie.addEventListener('complete', () => {
      // Prevent double-firing
      if (hasCalledComplete.current) return
      hasCalledComplete.current = true
      onCompleteRef.current?.()
    })
  }, [])

  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      speed={speed}
      className={className}
      style={style}
      dotLottieRefCallback={handleDotLottieRef}
    />
  )
}
