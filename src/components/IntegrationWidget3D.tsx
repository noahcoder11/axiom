import { useState, useMemo } from 'react';
import * as math from 'mathjs';
import MathInput from './MathInput';
import type { Graph3DExpression } from './Graph3D';
import Graph3D from './Graph3D';
import PrintSettingsModal from './PrintSettingsModal';
import Latex from './Latex';


export default function IntegrationWidget3D() {

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [latexFunc, setLatexFunc] = useState('$$ \\frac{1}{10}x^2+\\frac{1}{10}y^2 $$');
  const [asciiFunc, setAsciiFunc] = useState('(1/10)*x^2 + (1/10) * y^2');

  const [lowerBoundX, setLowerBoundX] = useState('-5');
  const [upperBoundX, setUpperBoundX] = useState('10');
  const [lowerBoundY, setLowerBoundY] = useState('-5');
  const [upperBoundY, setUpperBoundY] = useState('10');
  const [intervalsX, setIntervalsX] = useState('10');
  const [intervalsY, setIntervalsY] = useState('10');
  const [method, setMethod] = useState('midpoint');

  const [showFunction, setShowFunction] = useState(true);
  const [showPrisms, setShowPrisms] = useState(true);

  const graphExpressions = useMemo<Graph3DExpression[]>(() => {
    const exprs: Graph3DExpression[] = [];
    if (asciiFunc) {
      if (showFunction) {
        const xMinVal = Number(lowerBoundX);
        const xMaxVal = Number(upperBoundX);
        const yMinVal = Number(lowerBoundY);
        const yMaxVal = Number(upperBoundY);
        const hasValidBounds = !isNaN(xMinVal) && !isNaN(xMaxVal) && !isNaN(yMinVal) && !isNaN(yMaxVal);

        exprs.push({
          id: 'f',
          latex: asciiFunc,
          color: '#7c6fff', // Axiom accent color
          meshStyle: 'SURFACE',
          xMin: hasValidBounds ? xMinVal : undefined,
          xMax: hasValidBounds ? xMaxVal : undefined,
          yMin: hasValidBounds ? yMinVal : undefined,
          yMax: hasValidBounds ? yMaxVal : undefined
        });
      }

      // The 3D Volume Approximation logic for rectangles/cuboids will go here!
      if (!isNaN(Number(lowerBoundX)) && !isNaN(Number(lowerBoundY)) && !isNaN(Number(upperBoundX)) && !isNaN(Number(upperBoundY))) {
        try {
          const f = math.compile(asciiFunc);
          const ax = Number(lowerBoundX);
          const bx = Number(upperBoundX);
          const ay = Number(lowerBoundY);
          const by = Number(upperBoundY);
          const nx = Number(intervalsX);
          const ny = Number(intervalsY);
          const dx = (bx - ax) / nx;
          const dy = (by - ay) / ny;
          const prisms: { x: number; y: number; height: number }[] = [];
          for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
              const x = ax + (i + 0.5) * dx; // midpoint of cell (for visual box placement)
              const y = ay + (j + 0.5) * dy;

              // Determine evaluation point based on Riemann sum rule
              let evalX = x;
              let evalY = y;
              if (method === 'lower-left') {
                evalX = ax + i * dx;
                evalY = ay + j * dy;
              } else if (method === 'lower-right') {
                evalX = ax + (i + 1) * dx;
                evalY = ay + j * dy;
              } else if (method === 'upper-left') {
                evalX = ax + i * dx;
                evalY = ay + (j + 1) * dy;
              } else if (method === 'upper-right') {
                evalX = ax + (i + 1) * dx;
                evalY = ay + (j + 1) * dy;
              }

              const height = f.evaluate({ x: evalX, y: evalY });
              prisms.push({ x, y, height });
            }
          }
          if (showPrisms) {
            exprs.push({
              id: 'prisms',
              dx,
              dy,
              prismData: prisms,
              color: '#e879f9',
              meshStyle: 'SOLID'
            });
          }
        } catch (e) {
          // expression not valid yet
        }
      }
    }

    return exprs;
  }, [latexFunc, lowerBoundX, upperBoundX, lowerBoundY, upperBoundY, intervalsX, intervalsY, method, showFunction, showPrisms]);

  const approximation = useMemo(() => {
    if (latexFunc && lowerBoundX && upperBoundX && intervalsX && lowerBoundY && upperBoundY && intervalsY && method) {
      try {
        const f = math.compile(asciiFunc);
        const a = Number(lowerBoundX);
        const b = Number(upperBoundX);
        const c = Number(lowerBoundY);
        const d = Number(upperBoundY);
        const n = Number(intervalsX);
        const m = Number(intervalsY);
        const dx = (b - a) / n;
        const dy = (d - c) / m;

        let sum = 0;

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < m; j++) {
            let evalX = a + (i + 0.5) * dx;
            let evalY = c + (j + 0.5) * dy;

            if (method === 'lower-left') {
              evalX = a + i * dx;
              evalY = c + j * dy;
            } else if (method === 'lower-right') {
              evalX = a + (i + 1) * dx;
              evalY = c + j * dy;
            } else if (method === 'upper-left') {
              evalX = a + i * dx;
              evalY = c + (j + 1) * dy;
            } else if (method === 'upper-right') {
              evalX = a + (i + 1) * dx;
              evalY = c + (j + 1) * dy;
            }

            sum += f.evaluate({ x: evalX, y: evalY });
          }
        }

        return sum * dx * dy;
      } catch (e) {
        // invalid math expression, ignore
      }
    }
    return undefined;
  }, [latexFunc, asciiFunc, lowerBoundX, upperBoundX, lowerBoundY, upperBoundY, intervalsX, intervalsY, method]);

  const exactResult = useMemo(() => {
    if (latexFunc && asciiFunc && lowerBoundX && upperBoundX && lowerBoundY && upperBoundY) {
      try {
        const f = math.compile(asciiFunc);
        const a = Number(lowerBoundX);
        const b = Number(upperBoundX);
        const c = Number(lowerBoundY);
        const d = Number(upperBoundY);

        // For "exact" value, we use a 100x100 grid with 2D Simpson's rule.
        // This requires exactly 10,000 evaluations, which is fast enough for JS.
        const N = 100;
        const M = 100;
        const dx = (b - a) / N;
        const dy = (d - c) / M;

        let sum = 0;
        for (let i = 0; i <= N; i++) {
          const wx = (i === 0 || i === N) ? 1 : (i % 2 !== 0 ? 4 : 2);
          const x = a + i * dx;

          for (let j = 0; j <= M; j++) {
            const wy = (j === 0 || j === M) ? 1 : (j % 2 !== 0 ? 4 : 2);
            const y = c + j * dy;

            const weight = wx * wy;
            sum += weight * f.evaluate({ x, y });
          }
        }

        const exact = sum * (dx * dy) / 9;
        if (!isNaN(exact) && isFinite(exact)) {
          return exact;
        }
      } catch (e) {
        console.error("Exact evaluation failed:", e);
      }
    }
    return undefined;
  }, [latexFunc, asciiFunc, lowerBoundX, upperBoundX, lowerBoundY, upperBoundY]);

  const errorVal = useMemo(() => {
    if (approximation !== undefined && exactResult !== undefined && exactResult !== 0) {
      return Math.abs((approximation - exactResult) / exactResult) * 100;
    }
    return undefined;
  }, [approximation, exactResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: 'var(--space-2xl)' }}>
      <div className="responsive-grid" style={{ alignItems: 'stretch' }}>

        {/* --- INPUT PANEL --- */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Parameters</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1 }}>
            <MathInput
              label="Function f(x, y)"
              value={latexFunc}
              onChange={(latex, ascii) => {
                setLatexFunc(latex);
                setAsciiFunc(ascii);
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Lower Bound X (a)</label>
                <input
                  type="number"
                  value={lowerBoundX}
                  onChange={(e) => setLowerBoundX(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Upper Bound X (b)</label>
                <input
                  type="number"
                  value={upperBoundX}
                  onChange={(e) => setUpperBoundX(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Lower Bound Y (c)</label>
                <input
                  type="number"
                  value={lowerBoundY}
                  onChange={(e) => setLowerBoundY(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Upper Bound Y (d)</label>
                <input
                  type="number"
                  value={upperBoundY}
                  onChange={(e) => setUpperBoundY(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>X Intervals (n)</label>
                <input
                  type="number"
                  value={intervalsX}
                  onChange={(e) => setIntervalsX(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                  min="1"
                  step="1"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Y Intervals (m)</label>
                <input
                  type="number"
                  value={intervalsY}
                  onChange={(e) => setIntervalsY(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px' }}
                  min="1"
                  step="1"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '14px', width: '100%', cursor: 'pointer' }}
                >
                  <option value="midpoint">Midpoint Rule</option>
                  <option value="lower-left">Lower-Left Corner</option>
                  <option value="lower-right">Lower-Right Corner</option>
                  <option value="upper-left">Upper-Left Corner</option>
                  <option value="upper-right">Upper-Right Corner</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginTop: 'var(--space-xs)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-subtle)' }}>
                <input type="checkbox" checked={showFunction} onChange={(e) => setShowFunction(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                Show Function
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-subtle)' }}>
                <input type="checkbox" checked={showPrisms} onChange={(e) => setShowPrisms(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                Show Prisms
              </label>
            </div>
          </div>

          {/* Results & Analysis */}
          <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-md)'
            }}>
              Results & Analysis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {/* Riemann Approximation Card */}
              <div style={{
                background: 'rgba(232, 121, 249, 0.02)',
                border: '1px solid rgba(232, 121, 249, 0.12)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'default'
              }} className="results-card-riemann">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#e879f9' }}>
                    Riemann Volume Approximation
                  </span>
                  {approximation !== undefined && exactResult !== undefined && errorVal !== undefined && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: '600',
                      background: errorVal < 1 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                      color: errorVal < 1 ? 'var(--tag-cs)' : 'var(--tag-algebra)',
                      border: errorVal < 1 ? '1px solid rgba(52, 211, 153, 0.15)' : '1px solid rgba(251, 146, 60, 0.15)'
                    }}>
                      {errorVal === 0 ? "Exact Match" : `Error: ${errorVal < 0.0001 ? '< 0.0001%' : `${errorVal.toFixed(4)}%`}`}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                    letterSpacing: '-0.02em'
                  }}>
                    {approximation !== undefined ? approximation.toFixed(8) : '—'}
                  </div>
                  <CopyButton value={approximation} />
                </div>
              </div>

              {/* Exact Value Card */}
              <div style={{
                background: 'rgba(124, 111, 255, 0.02)',
                border: '1px solid rgba(124, 111, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'default'
              }} className="results-card-exact">
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-accent)' }}>
                  Exact Volume (Double Integral)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                    letterSpacing: '-0.02em'
                  }}>
                    {exactResult !== undefined ? exactResult.toFixed(8) : '—'}
                  </div>
                  <CopyButton value={exactResult} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RESULTS PANEL --- */}
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid var(--color-border)',
          height: '100%',
          minHeight: '550px'
        }}>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10, /* ensures it sits on top of canvas */
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            className="hover-bright"
          >
            3D Print Model
          </button>
          <Graph3D expressions={graphExpressions} style={{ height: '100%', minHeight: '550px', border: 'none' }} />
        </div>

        {isPrintModalOpen && (
          <PrintSettingsModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            asciiFunc={asciiFunc}
            lowerBoundX={lowerBoundX}
            upperBoundX={upperBoundX}
            lowerBoundY={lowerBoundY}
            upperBoundY={upperBoundY}
            intervalsX={intervalsX}
            intervalsY={intervalsY}
            method={method}
          />
        )}

      </div>

      {/* --- MATHEMATICAL EXPLANATION CARD --- */}
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
          Understanding the 3D Mathematics
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>
              {method === 'midpoint' && "Double Midpoint Riemann Sum"}
              {method === 'lower-left' && "Double Lower-Left Riemann Sum"}
              {method === 'lower-right' && "Double Lower-Right Riemann Sum"}
              {method === 'upper-left' && "Double Upper-Left Riemann Sum"}
              {method === 'upper-right' && "Double Upper-Right Riemann Sum"}
            </h4>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Definite double integration calculates the signed volume under a surface <Latex math="z = f(x, y)" /> over a rectangular domain <Latex math="R = [a, b] \times [c, d]" />. Riemann sums approximate this volume by partitioning the domain into <Latex math="n \times m" /> subrectangles of dimensions <Latex math="\Delta x \times \Delta y" />:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="V_{\text{approx}} = \sum_{i=0}^{n-1} \sum_{j=0}^{m-1} f(x_{\text{eval}}, y_{\text{eval}}) \Delta x \Delta y" block />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where grid cell widths are <Latex math="\Delta x = \frac{b - a}{n}" /> and <Latex math="\Delta y = \frac{d - c}{m}" />. Visual cuboids are centered at <Latex math="(x_{\text{cell}}, y_{\text{cell}}) = (a + (i+0.5)\Delta x, c + (j+0.5)\Delta y)" />, while the mathematical height-sampling point is:
            </p>

            <ul style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', paddingLeft: '20px', margin: '8px 0' }}>
              {method === 'midpoint' && (
                <li><strong>Midpoint Rule</strong>: Evaluates at the cell center: <Latex math="x_{\text{eval}} = a + (i + 0.5)\Delta x, \quad y_{\text{eval}} = c + (j + 0.5)\Delta y" />.</li>
              )}
              {method === 'lower-left' && (
                <li><strong>Lower-Left Corner</strong>: Evaluates at the bottom-left coordinate: <Latex math="x_{\text{eval}} = a + i\Delta x, \quad y_{\text{eval}} = c + j\Delta y" />.</li>
              )}
              {method === 'lower-right' && (
                <li><strong>Lower-Right Corner</strong>: Evaluates at the bottom-right coordinate: <Latex math="x_{\text{eval}} = a + (i + 1)\Delta x, \quad y_{\text{eval}} = c + j\Delta y" />.</li>
              )}
              {method === 'upper-left' && (
                <li><strong>Upper-Left Corner</strong>: Evaluates at the top-left coordinate: <Latex math="x_{\text{eval}} = a + i\Delta x, \quad y_{\text{eval}} = c + (j + 1)\Delta y" />.</li>
              )}
              {method === 'upper-right' && (
                <li><strong>Upper-Right Corner</strong>: Evaluates at the top-right coordinate: <Latex math="x_{\text{eval}} = a + (i + 1)\Delta x, \quad y_{\text{eval}} = c + (j + 1)\Delta y" />.</li>
              )}
            </ul>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
            <h4 style={{ color: 'var(--color-accent)', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Double Integral Reference (Exact Volume)</h4>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              For the mathematical baseline benchmark, we run a high-resolution <Latex math="100 \times 100" /> composite <strong>2D Simpson's Rule</strong> double integration. By interpolating a quadratic paraboloid surface over adjacent subgrids, it achieves a high error convergence rate:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="\iint_R f(x, y) \, dA \approx \frac{\Delta x \Delta y}{9} \sum_{i=0}^{N} \sum_{j=0}^{M} W_x(i) W_y(j) f(x_i, y_j)" block />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              with grid weights <Latex math="W(k)" /> configured as <Latex math="1" /> at margins, <Latex math="4" /> at odd steps, and <Latex math="2" /> at inner even steps. This provides double integration precise to over 8 decimal places synchronously in real time.
            </p>
          </div>
        </div>
      </div>

    </div>);
}

function CopyButton({ value }: { value: number | undefined }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value === undefined) return;
    navigator.clipboard.writeText(value.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (value === undefined) return null;

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '26px',
        height: '26px',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: copied ? '#4ade80' : 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        marginLeft: '8px',
        flexShrink: 0
      }}
      title="Copy value to clipboard"
      className="hover-bright"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}