'use client'

import dynamic from '@/lib/next-dynamic-shim'

// Dynamically import LottiePlayer to reduce initial bundle size
// lottie-react is ~40KB gzipped and only needed for specific UI states
export const LottiePlayerDynamic = dynamic(
  () => import('./LottiePlayer').then(mod => mod.LottiePlayer),
  {
    ssr: false,
    loading: () => null, // No loading indicator - animations appear when ready
  }
)
