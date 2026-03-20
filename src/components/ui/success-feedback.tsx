'use client'

import { LottiePlayer } from '@/components/animations'

export interface SuccessFeedbackProps {
  /** Title text displayed below the animation */
  title: string
  /** Optional subtitle text */
  subtitle?: string
  /** Animation source - defaults to success.json */
  animation?: 'success' | 'trophy' | 'error'
  /** Size of the animation in pixels - defaults to 160 */
  size?: number
  /** Delay before animation starts (useful for modal transitions) - defaults to 500ms */
  delay?: number
  /** Whether to show the animation (useful for conditional rendering) - defaults to true */
  show?: boolean
  /** Additional className for the container */
  className?: string
  /** Children rendered below the title/subtitle (e.g., action buttons) */
  children?: React.ReactNode
}

const ANIMATION_MAP = {
  success: '/animations/success.json',
  trophy: '/animations/trophy.json',
  error: '/animations/error.json',
}

/**
 * Reusable success/feedback component with Lottie animation.
 * Use for success states, confirmations, and completion screens.
 *
 * @example
 * // In a modal
 * <SuccessFeedback
 *   title="PIN actualizado"
 *   subtitle="Tu nuevo PIN esta listo"
 *   animation="success"
 * >
 *   <button onClick={onClose}>Continuar</button>
 * </SuccessFeedback>
 *
 * @example
 * // Celebration with trophy
 * <SuccessFeedback
 *   title="Buen trabajo!"
 *   animation="trophy"
 *   size={200}
 * />
 */
export function SuccessFeedback({
  title,
  subtitle,
  animation = 'success',
  size = 160,
  delay = 500,
  show = true,
  className = '',
  children,
}: SuccessFeedbackProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Lottie animation container */}
      <div style={{ width: size, height: size }}>
        {show && (
          <LottiePlayer
            src={ANIMATION_MAP[animation]}
            loop={false}
            autoplay={true}
            delay={delay}
            style={{ width: size, height: size }}
          />
        )}
      </div>

      {/* Title */}
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: show ? 1 : 0 }}
      >
        {title}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p
          className="text-sm text-text-secondary mt-1 transition-opacity duration-500"
          style={{ opacity: show ? 1 : 0, transitionDelay: '100ms' }}
        >
          {subtitle}
        </p>
      )}

      {/* Children (action buttons, etc.) */}
      {children && (
        <div
          className="mt-6 w-full transition-opacity duration-500"
          style={{ opacity: show ? 1 : 0, transitionDelay: '200ms' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
