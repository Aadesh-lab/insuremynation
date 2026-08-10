import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import About from './pages/About';
import Career from './pages/Career';
import ClaimSupport from './pages/ClaimSupport';
import Contact from './pages/Contact';
import InsurancePage from './pages/InsurancePage';
import { PRODUCTS } from './data/products';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/career" element={<Career />} />
        <Route path="/claim-support" element={<ClaimSupport />} />
        <Route path="/contact" element={<Contact />} />
        {Object.values(PRODUCTS).map((product) => (
          <Route
            key={product.slug}
            path={product.slug}
            element={<InsurancePage product={product} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
