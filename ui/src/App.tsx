import { AnimatePresence, motion } from 'motion/react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Nav } from './components/Nav';
import { ACTIVE_DEPLOYMENT } from './deployment';
import { Landing } from './pages/Landing';
import { HowItWorks } from './pages/HowItWorks';
import { Trials } from './pages/Trials';
import { Prove } from './pages/Prove';
import { LedgerView } from './pages/LedgerView';
import { Registry } from './pages/Registry';
import { GetStarted } from './pages/GetStarted';

export function App() {
  const location = useLocation();

  return (
    <>
      <div className="aurora" aria-hidden />
      <div className="shell">
        <Nav />

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/trials" element={<Trials />} />
                <Route path="/prove" element={<Prove />} />
                <Route path="/ledger" element={<LedgerView />} />
                <Route path="/registry" element={<Registry />} />
                <Route path="/get-started" element={<GetStarted />} />
                <Route path="*" element={<Landing />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer>
          <div className="wrap">
            <span>
              Aegis — privacy-preserving clinical-trial matching, built on{' '}
              <a href="https://midnight.network">Midnight</a>.
            </span>
            <span>
              Compact language 0.23 · Apache-2.0 ·{' '}
              {ACTIVE_DEPLOYMENT
                ? `deployed on ${ACTIVE_DEPLOYMENT.network}`
                : 'not yet deployed'}
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
