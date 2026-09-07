import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation } from 'react-router-dom';

import { useChain } from '../chain/ChainProvider';
import { ACTIVE_DEPLOYMENT } from '../deployment';
import { WalletButton } from './WalletButton';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/trials', label: 'Trials' },
  { to: '/prove', label: 'Check eligibility' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/registry', label: 'Operators' },
  { to: '/get-started', label: 'Get started' },
];

function ChainChip() {
  const { status } = useChain();

  const [cls, text] =
    status.kind === 'live'
      ? ['live', `live · ${ACTIVE_DEPLOYMENT?.network ?? 'chain'}`]
      : status.kind === 'connecting'
        ? ['warn', 'connecting…']
        : status.kind === 'error'
          ? ['bad', 'indexer unreachable']
          : ['', 'local simulation'];

  return (
    <span className="chip" title={ACTIVE_DEPLOYMENT?.contractAddress ?? 'no deployment yet'}>
      <span className={`dot ${cls}`} />
      {text}
    </span>
  );
}

/**
 * The header.
 *
 * Seven destinations do not fit a phone, so below the breakpoint they collapse
 * into a drawer and only the status chips stay visible — those are the part
 * you want at a glance regardless of screen size.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close on navigation, so following a link never leaves the drawer covering
  // the page you just asked for.
  useEffect(() => setOpen(false), [location.pathname]);

  // A drawer that scrolls the page behind it feels broken on touch.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">◈</span> Aegis
        </NavLink>

        <div className="nav-links">
          {LINKS.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-status">
          <ChainChip />
          <WalletButton />
        </div>

        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`burger ${open ? 'open' : ''}`} aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="drawer"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {LINKS.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}>
                  {n.label}
                </NavLink>
              ))}
              <div className="drawer-status">
                <ChainChip />
                <WalletButton />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
