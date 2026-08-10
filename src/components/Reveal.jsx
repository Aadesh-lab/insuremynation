import { motion } from 'framer-motion';

/**
 * Scroll-triggered entrance primitives used across the insurance pages.
 *
 * The design's own easing language is `cubic-bezier(0.22, 1, 0.36, 1)` (the
 * hero headline and photo crossfades both use it), so the reveals here reuse it
 * rather than introducing a second motion vocabulary.
 */
export const EASE = [0.22, 1, 0.36, 1];

/** Fade + rise. `delay` staggers siblings that aren't in a variant group. */
export function Reveal({
  as: Tag = 'div',
  children,
  delay = 0,
  y = 32,
  duration = 0.65,
  amount = 0.25,
  ...rest
}) {
  const M = motion[Tag] ?? motion.div;
  return (
    <M
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

/** Parent that staggers any `<Stagger.Item>` descendants into view. */
export function Stagger({
  as: Tag = 'div',
  children,
  stagger = 0.08,
  delayChildren = 0,
  amount = 0.15,
  ...rest
}) {
  const M = motion[Tag] ?? motion.div;
  return (
    <M
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
      {...rest}
    >
      {children}
    </M>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const staggerItemScale = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** Fade only — no displacement. */
export const staggerItemFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/**
 * Visually inert, but keeps the variant chain alive so a nested element can be
 * staggered. Used for the cells of the hairline grids: the 1px rules between
 * cells are the parent's blue background showing through, so fading a *cell*
 * would turn the whole block into a blue slab mid-animation. The cell stays
 * solid and its contents animate instead.
 */
export const staggerPassthrough = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

Stagger.Item = function StaggerItem({ as: Tag = 'div', variants = staggerItem, children, ...rest }) {
  const M = motion[Tag] ?? motion.div;
  return (
    <M variants={variants} {...rest}>
      {children}
    </M>
  );
};
