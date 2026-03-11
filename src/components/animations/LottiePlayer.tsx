'use client'

import { useEffect, useRef, useCallback } from 'react'
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
  const dotLottieRef = useRef<any>(null)
  const onCompleteRef = useRef(onComplete)

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const handleDotLottieRef = useCallback((dotLottie: any) => {
    if (dotLottie) {
      dotLottieRef.current = dotLottie

      // Add complete event listener if callback provided
      if (onCompleteRef.current) {
        dotLottie.addEventListener('complete', () => {
          onCompleteRef.current?.()
        })
      }
    }
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
