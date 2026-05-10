import { useState, useMemo, useRef } from 'react';
import * as math from 'mathjs';
import MathInput from './MathInput';
import type { Graph3DExpression, Graph3DHandle } from './Graph3D';
import Graph3D from './Graph3D';


export default function IntegrationWidget3D() {

  const graphRef = useRef<Graph3DHandle>(null);

  const [latexFunc, setLatexFunc] = useState('$$ \\frac{1}{30}x^2+\\frac{1}{30}y^2 $$');
  const [asciiFunc, setAsciiFunc] = useState('(1/30)*x^2 + (1/30) * y^2');

  const [lowerBoundX, setLowerBoundX] = useState('0');
  const [upperBoundX, setUpperBoundX] = useState('10');
  const [lowerBoundY, setLowerBoundY] = useState('0');
  const [upperBoundY, setUpperBoundY] = useState('10');
  const [intervalsX, setIntervalsX] = useState('10');
  const [intervalsY, setIntervalsY] = useState('10');
  const [method, setMethod] = useState('midpoint');

  const [showFunction, setShowFunction] = useState(true);
  const [showPrisms, setShowPrisms] = useState(true);

  const graphExpressions = useMemo<Graph3DExpression[]>(() => {
    const exprs: Graph3DExpression[] = [];

    // 1. Plot the main function
    if (asciiFunc) {
      if (showFunction) {
        exprs.push({
          id: 'f',
          latex: asciiFunc,
          color: '#7c6fff', // Axiom accent color
          meshStyle: 'SURFACE'
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
              const x = ax + (i + 0.5) * dx; // midpoint of cell
              const y = ay + (j + 0.5) * dy;
              const height = f.evaluate({ x, y });
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
              meshStyle: 'PRISM'
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

        switch (method) {
          case 'midpoint': {
            let sum = 0;

            for (let i = 0; i < n; i++) {
              for (let j = 0; j < m; j++) {
                sum += f.evaluate({ x: a + (i + 0.5) * dx, y: c + (j + 0.5) * dy });
              }
            }

            return sum * dx * dy;
          }
        }
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

  return (
    <div className="responsive-grid">

      {/* --- INPUT PANEL --- */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', height: 'fit-content' }}>
        <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Parameters</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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

        {/* TODO: Add your numerical results here */}
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Results</h2>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Approximate Integral: {approximation?.toFixed(10)}<br />
            Actual Value: {exactResult?.toFixed(10)}
          </div>
        </div>
      </div>

      {/* --- RESULTS PANEL (Desmos Graph) --- */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => graphRef.current?.exportSTL()}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10, /* ensures it sits on top of canvas */
            padding: '8px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Download STL
        </button>
        <Graph3D ref={graphRef} expressions={graphExpressions} style={{ height: '500px' }} />
      </div>

    </div>);
}