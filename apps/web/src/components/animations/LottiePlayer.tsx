'use client'

import { useRef, useState, useEffect } from 'react'
import LottieReact, { type LottieRefCurrentProps } from 'lottie-react'
import { haptic as fireHaptic } from '@/lib/haptics'

// `lottie-react`'s package.json declares `"browser": "build/index.umd.js"`.
// Vite's resolver prefers the `browser` field over `module`, so it pulls in
// the UMD build. The prebundled wrapper at
// `apps/web/node_modules/.vite/deps/lottie-react.js` ends with
// `export default require_index_umd()`, which is the entire UMD namespace
// object — `{ default: <component>, useLottie, useLottieInteractivity,
// LottiePlayer }`, NOT the React component. As a result `import Lottie from
// 'lottie-react'` resolves to the namespace, and JSX rendering `<Lottie />`
// throws "Element type is invalid ... got: object". Unwrap once, here.
// (The fallback `?? LottieReact` keeps this safe if a future Vite/lottie-react
// release fixes the package and the default export becomes the component.)
const Lottie = ((LottieReact as unknown) as { default?: typeof LottieReact })
  .default ?? LottieReact

export interface LottiePlayerProps {
  src: string
  loop?: boolean
  autoplay?: boolean
  speed?: number
  delay?: number // Delay in ms before playing (useful for modal transitions)
  className?: string
  style?: React.CSSProperties
  onComplete?: () => void
  /**
   * Fire a single button-tap haptic the moment playback actually starts
   * (respecting `delay`). Defaults to true so every success / delete /
   * confirmation Lottie in the app gets a tactile companion to its visual
   * cue without each call site having to wire it up. Opt out with
   * `haptic={false}` for decorative or looping illustrations where a
   * vibration would be noise.
   */
  haptic?: boolean
}

export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  delay = 0,
  className,
  style,
  onComplete,
  haptic = true,
}: LottiePlayerProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const hasCalledComplete = useRef(false)
  const hasFiredHaptic = useRef(false)
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [shouldPlay, setShouldPlay] = useState(delay === 0)

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
      .catch(() => {
        // Silently fail - animation simply won't show
      })

    return () => {
      cancelled = true
    }
  }, [jsonPath])

  // Handle delayed autoplay
  useEffect(() => {
    if (delay > 0 && autoplay) {
      const timer = setTimeout(() => {
        setShouldPlay(true)
        // Manually trigger play after delay
        if (lottieRef.current) {
          lottieRef.current.play()
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, autoplay])

  useEffect(() => {
    if (lottieRef.current && speed !== 1) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, animationData])

  // Fire the button-tap haptic the moment playback actually starts.
  // We wait for both `animationData` (fetch resolved) and `shouldPlay`
  // (delay elapsed) so the buzz lines up with the first painted frame
  // rather than the mount. Guarded by a ref so the effect only fires once
  // per component lifetime — re-renders won't re-trigger.
  useEffect(() => {
    if (!haptic) return
    if (!animationData || !shouldPlay) return
    if (hasFiredHaptic.current) return
    hasFiredHaptic.current = true
    fireHaptic()
  }, [haptic, animationData, shouldPlay])

  const handleComplete = () => {
    if (hasCalledComplete.current) return
    hasCalledComplete.current = true
    onComplete?.()
  }

  if (!animationData) {
    return null
  }

  // If delay is set and we haven't reached the play time yet, don't autoplay
  const effectiveAutoplay = autoplay && shouldPlay

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={effectiveAutoplay}
      className={className}
      style={style}
      onComplete={handleComplete}
      rendererSettings={{
        preserveAspectRatio: 'xMidYMid slice'
      }}
    />
  )
}
