'use client'

import { useRef, useState, useEffect } from 'react'
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
  const [animationData, setAnimationData] = useState<object | null>(null)

  // Convert .lottie paths to .json paths and fetch the data
  const jsonPath = src.replace(/\.lottie$/, '.json')

  useEffect(() => {
    let cancelled = false

    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setAnimationData(data)
        }
      })
      .catch(err => {
        console.error('Failed to load Lottie animation:', err)
      })

    return () => {
      cancelled = true
    }
  }, [jsonPath])

  useEffect(() => {
    if (lottieRef.current && speed !== 1) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, animationData])

  const handleComplete = () => {
    if (hasCalledComplete.current) return
    hasCalledComplete.current = true
    onComplete?.()
  }

  if (!animationData) {
    return null
  }

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
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
