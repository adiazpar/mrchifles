import { createAnimation, iosTransitionAnimation } from '@ionic/react'
import type { AnimationBuilder } from '@ionic/react'

/**
 * Page transition for the per-business inner outlet.
 *
 * Forward push: delegate to Ionic's default iOS transition. That branch
 * fades the entering toolbar's background AND its children together
 * (`ios.transition.js` lines ~493-503), so the whole top bar appears as
 * a single unit. This is the look the per-business shell aims for — it
 * matches the hub → business push at the outer outlet, which is what
 * the user was happy with.
 *
 * Back nav: replace it. In back direction the iOS transition leaves the
 * toolbar background opaque from frame 0 but still fades the title /
 * back button / ion-buttons from `opacity: 0.01` → 1 over the full
 * duration (same file, lines ~479-489 — `enteringToolBarBg` only gets
 * the opacity fromTo in the forward branch). The visible result is a
 * "header chrome is here, but title + back arrow + menu dot materialize
 * a beat later" stutter on Team → Manage / Provider → Manage. We do a
 * clean slide of the entire `.ion-page` instead: header and content
 * move as one rigid surface, no per-element opacity choreography on
 * the toolbar.
 *
 * The lifecycle hooks (`beforeRemoveClass('ion-page-invisible')`,
 * `beforeClearStyles(['opacity'])`) live on the entering sub-animation,
 * NOT the root, because they only operate on the animation's own
 * elements — putting them on an element-less root is a no-op and the
 * entering page would stay at `opacity: 0` for the whole slide
 * (`afterTransition` only clears `.ion-page-invisible` once the
 * animation finishes, so you'd see the leaving page slide off into a
 * blank, then the entering page snap in).
 */
const DURATION = 540
const EASING = 'cubic-bezier(0.32,0.72,0,1)'
const OFF_OPACITY = 0.8

const backSlide = (
  enteringEl: HTMLElement,
  leavingEl: HTMLElement | undefined,
  duration: number,
  easing: string,
) => {
  const isRTL = enteringEl.ownerDocument.dir === 'rtl'
  const OFF_LEFT = isRTL ? '33%' : '-33%'
  const LEAVING_OFF = isRTL ? '-100%' : '100%'

  const root = createAnimation().duration(duration).easing(easing).fill('both')

  const entering = createAnimation()
    .addElement(enteringEl)
    .beforeRemoveClass('ion-page-invisible')
    .beforeClearStyles(['opacity'])
    .fromTo('transform', `translateX(${OFF_LEFT})`, 'translateX(0)')
    .fromTo('opacity', OFF_OPACITY, 1)

  root.addAnimation(entering)

  if (leavingEl) {
    const leaving = createAnimation()
      .addElement(leavingEl)
      .beforeClearStyles(['opacity'])
      .fromTo('transform', 'translateX(0)', `translateX(${LEAVING_OFF})`)

    root.addAnimation(leaving)
  }

  return root
}

export const businessShellTransition: AnimationBuilder = (baseEl, opts) => {
  if (opts.direction === 'back') {
    return backSlide(
      opts.enteringEl as HTMLElement,
      opts.leavingEl as HTMLElement | undefined,
      opts.duration ?? DURATION,
      opts.easing ?? EASING,
    )
  }
  return iosTransitionAnimation(baseEl, opts)
}
