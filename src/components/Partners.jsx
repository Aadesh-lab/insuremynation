import { motion } from 'framer-motion';
import { BLUE, PARTNERS } from '../data/site';

/**
 * Partner logo wall. `padding` differs per page in the design:
 * Landing / About use `104px 0`, the product pages use `0 0 104px`.
 */
export default function Partners({ padding = '104px 0', animate = false }) {
  const Grid = animate ? motion.div : 'div';
  const Logo = animate ? motion.img : 'img';

  const gridProps = animate
    ? {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: { once: true, amount: 0.2 },
        variants: { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } },
      }
    : {};

  const logoProps = animate
    ? {
        variants: {
          hidden: { opacity: 0, scale: 0.9 },
          visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
        },
      }
    : {};

  return (
    <div
      data-r="partners"
      style={{
        position: 'relative',
        width: 1728,
        display: 'flex',
        flexDirection: 'column',
        gap: 72,
        padding,
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: 'Poppins,sans-serif',
          fontWeight: 500,
          fontSize: 24,
          lineHeight: 1,
          color: BLUE,
          textTransform: 'uppercase',
        }}
      >
        [ our insurance partners ]
      </span>
      <Grid
        data-r="pgrid"
        {...gridProps}
        style={{
          width: 1200,
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          gap: '48px 60px',
          justifyItems: 'center',
          alignItems: 'center',
        }}
      >
        {PARTNERS.map((name) => (
          <Logo
            key={name}
            data-r="plogo"
            decoding="async"
            src={`/assets/${name}.webp`}
            alt=""
            {...logoProps}
            style={{ height: 72, width: 'auto', maxWidth: 200, objectFit: 'contain' }}
          />
        ))}
      </Grid>
    </div>
  );
}
