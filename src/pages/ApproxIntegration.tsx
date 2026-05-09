import { useState } from 'react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import IntegrationWidget2D from '../components/IntegrationWidget2D';
import IntegrationWidget3D from '../components/IntegrationWidget3D';

export default function ApproxIntegration() {
  const [mode, setMode] = useState('2D');

  return (
    <>
      <Navbar showBack />

      <main className="container" style={{ paddingTop: 'var(--space-2xl)', minHeight: '80vh' }}>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="hero__eyebrow">Calculus</div>

          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Approximate Integration
            </h1>

            <div style={{ flex: 1 }}></div>

            <div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px', width: '100%', cursor: 'pointer' }}
              >
                <option value="2D">2D Area Approximation</option>
                <option value="3D">3D Volume Approximation</option>
              </select>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-muted)' }}>
            Visualize and compute numerical integration using Midpoint, Trapezoid, and Simpson's methods.
          </p>
        </div>

        {mode === '2D' ? (<IntegrationWidget2D />) : (<IntegrationWidget3D />)}
      </main>

      <Footer />
    </>
  );
}
