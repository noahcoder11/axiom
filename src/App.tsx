import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// ── Import tool pages here as you build them ──
// import ApproxIntegration from './pages/tools/ApproxIntegration';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* ── Tool routes (uncomment as tools are built) ── */}
        {/* <Route path="/axiom/approx-integration" element={<ApproxIntegration />} /> */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
