import { motion } from 'framer-motion';
import { EASE, VIEWPORT, prefersReducedMotion } from './Reveal';
import { EXPERT_COPY, PHONE_HREF, RED, WHATSAPP, BLUE } from '../data/site';

const ctaBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 60,
  padding: '0 34px',
  borderRadius: 52,
  fontFamily: 'Poppins,sans-serif',
  fontWeight: 500,
  fontSize: 19,
  whiteSpace: 'nowrap',
};

export default function TalkToExperts({ padding = '0 0 104px', animate = false }) {
  const animated = animate && !prefersReducedMotion();
  const Row = animated ? motion.div : 'div';
  const rowProps = animated
    ? {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: VIEWPORT,
        transition: { duration: 0.4, ease: EASE },
      }
    : {};

  return (
    <div
      data-r="expert"
      style={{ position: 'relative', width: 1728, boxSizing: 'border-box', padding }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgb(0,74,173) 0%, rgb(0,30,71) 140%)',
          padding: '72px 96px',
          boxSizing: 'border-box',
        }}
      >
        <Row
          data-r="erow"
          {...rowProps}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 64,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
            <span
              data-r="ehead"
              style={{
                fontFamily: 'Poppins,sans-serif',
                fontSize: 52,
                lineHeight: 1.1,
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              <strong style={{ display: 'block', fontWeight: 700 }}>Talk to our</strong>
              <span style={{ display: 'block', fontWeight: 300 }}>Insurance Experts</span>
            </span>
            <span
              data-r="ecopy"
              style={{
                fontFamily: 'Poppins,sans-serif',
                fontWeight: 300,
                fontSize: 21,
                lineHeight: 1.6,
                color: '#fff',
                textWrap: 'pretty',
              }}
            >
              {EXPERT_COPY}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'flex-start',
              flexShrink: 0,
            }}
          >
            <div
              data-r="ectas"
              style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}
            >
              <a
                href={PHONE_HREF}
                className="dc-cta-call"
                style={{ ...ctaBase, background: RED, color: '#fff' }}
              >
                Call an expert
              </a>
              <a
                href={WHATSAPP}
                className="dc-cta-whatsapp"
                target="_blank"
                rel="noreferrer"
                style={{ ...ctaBase, background: '#fff', color: BLUE }}
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </Row>
      </div>
    </div>
  );
}
