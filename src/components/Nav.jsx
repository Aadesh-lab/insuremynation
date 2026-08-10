import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CaretDown } from './Icons';
import { BLUE, INSURANCE_LINKS, PHONE_HREF } from '../data/site';

/**
 * Site header. Two colour treatments in the design:
 *   `blue`  — navy type over a light hero (Landing, Health, Marine)
 *   `white` — white type over a darkened hero (everything else)
 *
 * `active` underlines the current section, `activeProduct` bolds the matching
 * entry inside the Insurance dropdown.
 */
export default function Nav({
  variant = 'blue',
  active = null,
  activeProduct = null,
  logoAsLink = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const white = variant === 'white';
  const color = white ? '#fff' : BLUE;
  const caretFill = white ? 'rgb(255,255,255)' : 'rgb(4,74,173)';
  const underline = white ? '1px solid rgba(255,255,255,0.85)' : `1px solid ${BLUE}`;
  const ctaRing = white ? 'inset 0 0 0 1px rgba(255,255,255,0.9)' : `inset 0 0 0 1px ${BLUE}`;
  const logo = white ? '/assets/logo-white-red.webp' : '/assets/logo.webp';

  const linkStyle = (isActive) => ({
    fontFamily: 'ABeeZee,sans-serif',
    fontSize: 18,
    color,
    whiteSpace: 'nowrap',
    ...(isActive ? { borderBottom: underline, paddingBottom: 2 } : null),
  });

  const logoImg = (
    <img
      data-r="navlogo"
      src={logo}
      alt="InsureNation"
      width={267}
      height={58}
      decoding="async"
      fetchpriority="high"
      style={{ width: 267, height: 58, objectFit: 'contain', flexShrink: 0 }}
    />
  );

  return (
    <div
      data-r="nav"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1728,
        height: 112,
        display: 'flex',
        flexDirection: 'row',
        padding: '0 100px',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      {logoAsLink ? (
        <Link to="/" style={{ flexShrink: 0, display: 'flex' }}>
          {logoImg}
        </Link>
      ) : (
        logoImg
      )}

      <div
        data-r="navlinks"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            borderRadius: 52,
            padding: '18px 24px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Link to="/about" style={linkStyle(active === 'about')}>
            About Us
          </Link>
        </div>

        <div
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
          style={{
            position: 'relative',
            display: 'flex',
            gap: 10,
            borderRadius: 52,
            padding: '18px 24px',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <a href="#" onClick={(e) => e.preventDefault()} style={linkStyle(active === 'insurance')}>
            Insurance
          </a>
          <CaretDown
            fill={caretFill}
            style={{
              transform: `rotate(${menuOpen ? '180deg' : '0deg'})`,
              transition: 'transform 0.25s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: '100%',
              minWidth: 220,
              padding: '10px 0',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 12px 32px rgba(0,30,71,0.18)',
              display: 'flex',
              flexDirection: 'column',
              opacity: menuOpen ? 1 : 0,
              transform: `translateY(${menuOpen ? '0' : '-8px'})`,
              pointerEvents: menuOpen ? 'auto' : 'none',
              transition: 'opacity 0.22s ease,transform 0.22s ease',
              zIndex: 50,
            }}
          >
            {INSURANCE_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="dc-menu-item"
                style={{
                  display: 'block',
                  padding: '12px 24px',
                  fontFamily: 'ABeeZee,sans-serif',
                  fontSize: 18,
                  color: BLUE,
                  whiteSpace: 'nowrap',
                  ...(activeProduct === item.to ? { fontWeight: 700 } : null),
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            borderRadius: 52,
            padding: '18px 24px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Link to="/claim-support" style={linkStyle(active === 'claim')}>
            Claim Support
          </Link>
        </div>
      </div>

      <div
        data-r="cta"
        style={{
          position: 'relative',
          width: 248,
          height: 58,
          borderRadius: 52,
          boxShadow: ctaRing,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <a
          href={PHONE_HREF}
          style={{
            fontFamily: 'ABeeZee,sans-serif',
            fontSize: 18,
            color,
            whiteSpace: 'nowrap',
          }}
        >
          Talk to Expert
        </a>
      </div>
    </div>
  );
}
