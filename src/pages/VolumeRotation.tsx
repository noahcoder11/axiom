import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Latex from '../components/Latex';
import MathInput from '../components/MathInput';

export default function VolumeRotation() {
  const [latexFunc, setLatexFunc] = useState('\\sqrt{x}');
  const [asciiFunc, setAsciiFunc] = useState('sqrt(x)');
  const [lowerBound, setLowerBound] = useState(0);
  const [upperBound, setUpperBound] = useState(4);
  const [axis, setAxis] = useState<'x' | 'y'>('x');
  const [method, setMethod] = useState<'disk' | 'shell'>('disk');
  const [divisions, setDivisions] = useState(12);

  // General placeholder calculation to keep layout active
  const calculatedVolume = 8 * Math.PI; // Placeholder: Integral of x dx from 0 to 4 is [x^2/2]*pi = 8pi

  return (
    <>
      <Navbar showBack />

      <main className="container" style={{ paddingTop: 'var(--space-2xl)', minHeight: '80vh' }}>
        {/* --- HEADER --- */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="hero__eyebrow">Calculus</div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Volume by Rotation (Solids of Revolution)
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Rotate a 2D mathematical curve around an axis to generate a 3D solid of revolution, and estimate its volume using the disk or shell method.
          </p>
        </div>

        {/* --- WORKSPACE GRID --- */}
        <div className="responsive-grid" style={{ alignItems: 'stretch' }}>

          {/* --- LEFT: CONTROLS & NUMERICS --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* --- CONFIGURATION CARD --- */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-subtle)', margin: '0 0 var(--space-md) 0' }}>
                Rotation Configuration
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Mathematical Function */}
                <MathInput
                  label="Function f(x)"
                  value={latexFunc}
                  onChange={(latex, ascii) => {
                    setLatexFunc(latex);
                    setAsciiFunc(ascii);
                  }}
                />

                {/* Bounds Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                      Lower Bound (a)
                    </label>
                    <input
                      type="number"
                      value={lowerBound}
                      onChange={(e) => setLowerBound(Number(e.target.value))}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                      Upper Bound (b)
                    </label>
                    <input
                      type="number"
                      value={upperBound}
                      onChange={(e) => setUpperBound(Number(e.target.value))}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '14px' }}
                    />
                  </div>
                </div>

                {/* Axis of Rotation */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                    Axis of Rotation
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => setAxis('x')}
                      className={`filter-chip ${axis === 'x' ? 'filter-chip--active' : ''}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      X-Axis (<Latex math="y = 0" />)
                    </button>
                    <button
                      onClick={() => setAxis('y')}
                      className={`filter-chip ${axis === 'y' ? 'filter-chip--active' : ''}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Y-Axis (<Latex math="x = 0" />)
                    </button>
                  </div>
                </div>

                {/* Approximation Method */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                    Method of Integration
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'disk' | 'shell')}
                    className="search-input"
                    style={{ width: '100%', cursor: 'pointer', paddingLeft: '14px' }}
                  >
                    <option value="disk">Disk/Washer Method</option>
                    <option value="shell">Cylindrical Shell Method</option>
                  </select>
                </div>

                {/* Divisions Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      Slices / Subintervals (N)
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                      {divisions}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="64"
                    step="1"
                    value={divisions}
                    onChange={(e) => setDivisions(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

              </div>
            </div>

            {/* --- RESULTS & NUMERICAL INTEGRATION CARD --- */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-subtle)', margin: 0 }}>
                Numerical Analysis Output
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {/* Approximated Volume */}
                <div style={{
                  background: 'rgba(232, 121, 249, 0.02)',
                  border: '1px solid rgba(232, 121, 249, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  position: 'relative'
                }} className="hover-bright">
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#e879f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Approximated Volume (V)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                      {calculatedVolume.toFixed(6)}
                    </div>
                    <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      ≈ {(calculatedVolume / Math.PI).toFixed(4)} <Latex math="\pi" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* --- RIGHT: 3D SOLID VISUALIZER --- */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            minHeight: '550px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            padding: '24px'
          }} className="hover-bright">

            {/* Neon glowing grid lines behind placeholder */}
            <div style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.05,
              background: 'radial-gradient(circle, var(--color-accent) 1px, transparent 1.5px)',
              backgroundSize: '24px 24px',
              pointerEvents: 'none'
            }} />

            {/* Glowing Calculus Solid Illustration Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(124, 111, 255, 0.08)',
              border: '2px dashed var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(124, 111, 255, 0.15)',
              position: 'relative',
              animation: 'pulse-glow 3s ease-in-out infinite'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>

            <div style={{ textAlign: 'center', maxWidth: '360px', zIndex: 1 }}>
              <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                3D Rotational Solid Viewport
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                This viewport will render the three-dimensional surface revolution curves using WebGL (Three.js). Rotate, slice, and scale the physical shell structures.
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 18px',
              borderRadius: '20px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)'
            }}>
              [ ready for three.js rendering engine: {asciiFunc} ]
            </div>

          </div>

        </div>

        {/* --- DYNAMIC MATHEMATICAL THEORY CARD --- */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginTop: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          backdropFilter: 'blur(10px)'
        }} className="hover-bright">

          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-subtle)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e879f9' }}>
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2-2.5z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
            Understanding Volume of Rotation
          </h3>

          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>
              {method === 'disk' ? "The Disk / Washer Method" : "The Cylindrical Shell Method"}
            </h4>

            {/* Intuition Check */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: {method === 'disk' ? "Slicing Salami" : "Russian Nesting Dolls"}</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                {method === 'disk'
                  ? "Imagine slicing a sausage or salami into thin flat circular coins. Each circular slice represents a cylinder of radius R and thickness dx. By adding up the volumes of these coins, we get the total solid volume!"
                  : "Imagine a set of hollow cylinders nested perfectly inside one another like nesting dolls. Each shell has a radius R, a height H, and an incredibly thin thickness dx. Adding their thin volumes gives the total solid volume!"
                }
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '8px 0' }}>
              The mathematical definite integral representation for rotation around the **X-Axis** is:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              {method === 'disk' ? (
                <Latex math="V = \pi \int_{a}^{b} [f(x)]^2 \, dx" block />
              ) : (
                <Latex math="V = 2\pi \int_{a}^{b} x \cdot f(x) \, dx" block />
              )}
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
