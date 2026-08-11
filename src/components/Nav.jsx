import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CaretDown } from './Icons';
import { BLUE, INSURANCE_LINKS, PHONE_HREF } from '../data/site';

/** Width at or below which the header becomes the fixed mobile bar. */
const MOBILE = '(max-width: 760px)';

/** Height of that bar. Mirrored by `--navbar-h` in global.css. */
const BAR_HEIGHT = 64;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * Site header. Two colour treatments in the design:
 *   `blue`  — navy type over a light hero (Landing, Health, Marine)
 *   `white` — white type over a darkened hero (everything else)
 *
 * Both are transparent and sit over the hero artwork, which is the design's
 * intent on desktop. Below 760px that arrangement can't hold: the row wraps to
 * three lines and ~230px tall, and on the `white` pages it puts white type on
 * pale photography. There the header becomes a fixed 64px bar — solid, so it
 * reads identically on every route, and always with the navy logo since the
 * white one would disappear against it.
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInsurance, setSheetInsurance] = useState(false);
  const isMobile = useMediaQuery(MOBILE);
  const { pathname } = useLocation();

  const white = variant === 'white';
  const color = white ? '#fff' : BLUE;
  const caretFill = white ? 'rgb(255,255,255)' : 'rgb(4,74,173)';
  const underline = white ? '1px solid rgba(255,255,255,0.85)' : `1px solid ${BLUE}`;
  const ctaRing = white ? 'inset 0 0 0 1px rgba(255,255,255,0.9)' : `inset 0 0 0 1px ${BLUE}`;
  // The fixed mobile bar is white, so the white-on-transparent logo cannot be
  // used there whatever the page variant asks for.
  const logo = white && !isMobile ? '/assets/logo-white-red.webp' : '/assets/logo.webp';

  // Dismiss the sheet whenever the route changes, on Escape, or once the
  // viewport grows back past the breakpoint.
  useEffect(() => setSheetOpen(false), [pathname]);
  useEffect(() => {
    if (!isMobile) setSheetOpen(false);
  }, [isMobile]);
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSheetOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const linkStyle = (isActive) => ({
    fontFamily: 'ABeeZee,sans-serif',
    fontSize: 18,
    color,
    whiteSpace: 'nowrap',
    ...(isActive ? { borderBottom: underline, paddingBottom: 2 } : null),
  });

  const sheetLinkStyle = (isActive) => ({
    display: 'block',
    padding: '16px 0',
    fontFamily: 'ABeeZee,sans-serif',
    fontSize: 19,
    color: BLUE,
    boxShadow: 'inset 0 -1px 0 rgba(0,74,173,0.12)',
    ...(isActive ? { fontWeight: 700 } : null),
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
      data-variant={variant}
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

      {/* ------------------------------------------------- mobile bar controls */}
      <button
        data-r="navburger"
        type="button"
        aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sheetOpen}
        aria-controls="nav-sheet"
        onClick={() => setSheetOpen((open) => !open)}
      >
        <span data-r="burgerbar" data-on={sheetOpen || undefined} />
        <span data-r="burgerbar" data-on={sheetOpen || undefined} />
        <span data-r="burgerbar" data-on={sheetOpen || undefined} />
      </button>

      {isMobile && (
        <>
          <div
            data-r="navscrim"
            data-open={sheetOpen || undefined}
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div id="nav-sheet" data-r="navsheet" data-open={sheetOpen || undefined}>
            <Link to="/about" style={sheetLinkStyle(active === 'about')}>
              About Us
            </Link>

            <button
              data-r="sheettoggle"
              type="button"
              aria-expanded={sheetInsurance}
              onClick={() => setSheetInsurance((open) => !open)}
              style={{
                ...sheetLinkStyle(active === 'insurance'),
                width: '100%',
                background: 'none',
                border: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              Insurance
              <CaretDown
                fill="rgb(4,74,173)"
                style={{
                  transform: `rotate(${sheetInsurance ? '180deg' : '0deg'})`,
                  transition: 'transform 0.25s ease',
                }}
              />
            </button>
            {sheetInsurance && (
              <div data-r="sheetproducts">
                {INSURANCE_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      ...sheetLinkStyle(activeProduct === item.to),
                      fontSize: 17,
                      padding: '13px 0 13px 18px',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            <Link to="/claim-support" style={sheetLinkStyle(active === 'claim')}>
              Claim Support
            </Link>
            <Link to="/contact" style={sheetLinkStyle(active === 'contact')}>
              Contact Us
            </Link>
            <Link to="/career" style={{ ...sheetLinkStyle(active === 'career'), boxShadow: 'none' }}>
              Career
            </Link>

            <a data-r="sheetcta" href={PHONE_HREF}>
              Talk to Expert
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export { BAR_HEIGHT };
