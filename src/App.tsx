import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ApproxIntegration from './pages/ApproxIntegration';
import VolumeRotation from './pages/VolumeRotation';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/axiom/approx-integration" element={<ApproxIntegration />} />
        <Route path="/axiom/volume-rotation" element={<VolumeRotation />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
