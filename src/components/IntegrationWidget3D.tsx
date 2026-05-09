import { useState, useMemo } from 'react';
import * as math from 'mathjs';
import MathInput from './MathInput';
import type { Graph3DExpression } from './Graph3D';
import Graph3D from './Graph3D';

export default function IntegrationWidget3D() {

  const [latexFunc, setLatexFunc] = useState('$$ \\frac{1}{30}x^2+\\frac{1}{30}y^2 $$');
  const [asciiFunc, setAsciiFunc] = useState('(1/30)*x^2 + (1/30) * y^2');

  const [lowerBoundX, setLowerBoundX] = useState('0');
  const [upperBoundX, setUpperBoundX] = useState('1');
  const [lowerBoundY, setLowerBoundY] = useState('0');
  const [upperBoundY, setUpperBoundY] = useState('1');
  const [intervals_x, setIntervalsX] = useState('10');
  const [intervals_y, setIntervalsY] = useState('10');
  const [method, setMethod] = useState('midpoint');

  const graphExpressions = useMemo<Graph3DExpression[]>(() => {
    const exprs: Graph3DExpression[] = [];

    // 1. Plot the main function
    if (asciiFunc) {
      exprs.push({
        id: 'f',
        latex: asciiFunc,
        color: '#7c6fff', // Axiom accent color
        meshStyle: 'SURFACE'
      });

      // The 3D Volume Approximation logic for rectangles/cuboids will go here!
      if (!isNaN(Number(lowerBoundX)) && !isNaN(Number(lowerBoundY)) && !isNaN(Number(upperBoundX)) && !isNaN(Number(upperBoundY))) {
        try {
          const f = math.compile(asciiFunc);
          const ax = Number(lowerBoundX);
          const bx = Number(upperBoundX);
          const ay = Number(lowerBoundY);
          const by = Number(upperBoundY);
          const nx = Number(intervals_x);
          const ny = Number(intervals_y);
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
          exprs.push({
            id: 'prisms',
            dx,
            dy,
            prismData: prisms,  // ← this was missing!
            color: '#e879f9',
            meshStyle: 'PRISM'
          });
        } catch (e) {
          // expression not valid yet
        }
      }
    }

    return exprs;
  }, [latexFunc, lowerBoundX, upperBoundX, lowerBoundY, upperBoundY, intervals_x, intervals_y, method]);
  /*
    const approximation = useMemo(() => {
      if (latexFunc && lowerBound && upperBound && intervals && method) {
        const f = math.compile(asciiFunc);
        const a = Number(lowerBound);
        const b = Number(upperBound);
        const n = Number(intervals);
        const dx = (b - a) / n;
  
        switch (method) {
          case 'left': {
            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += f.evaluate({ x: a + i * dx });
            }
            return sum * dx;
          }
          case 'right': {
            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += f.evaluate({ x: a + (i + 1) * dx });
            }
            return sum * dx;
          }
          case 'midpoint': {
            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += f.evaluate({ x: a + (i + 0.5) * dx });
            }
            return sum * dx;
          }
          case 'trapezoid': {
            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += (f.evaluate({ x: a + i * dx }) + f.evaluate({ x: a + (i + 1) * dx })) / 2;
            }
            return sum * dx;
          }
          case 'simpson': {
            let sum = 0;
            for (let i = 0; i < n; i += 2) {
              const x0 = a + i * dx;
              const x1 = a + (i + 1) * dx;
              const x2 = a + (i + 2) * dx;
              const y0 = f.evaluate({ x: x0 });
              const y1 = f.evaluate({ x: x1 });
              const y2 = f.evaluate({ x: x2 });
              sum += (y0 + 4 * y1 + y2) / 3;
            }
            return sum * dx;
          }
        }
      }
      return undefined;
    }, [latexFunc, lowerBound, upperBound, intervals, method]);
  
    const exactResult = useMemo(() => {
      if (latexFunc && lowerBound && upperBound && asciiFunc) {
        try {
          const f = math.compile(asciiFunc);
          const a = Number(lowerBound);
          const b = Number(upperBound);
  
          const n = 10000;
          const dx = (b - a) / n;
  
          let sum = 0;
          for (let i = 0; i < n; i += 2) {
            const x0 = a + i * dx;
            const x1 = a + (i + 1) * dx;
            const x2 = a + (i + 2) * dx;
            const y0 = f.evaluate({ x: x0 });
            const y1 = f.evaluate({ x: x1 });
            const y2 = f.evaluate({ x: x2 });
            sum += (y0 + 4 * y1 + y2) / 3;
          }
  
          const exact = sum * dx;
          if (!isNaN(exact) && isFinite(exact)) {
            return exact;
          }
        } catch (e) {
          console.error("Exact evaluation failed:", e);
        }
      }
      return undefined;
    }, [latexFunc, asciiFunc, lowerBound, upperBound]);
  */

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
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Lower Bound (a)</label>
              <input
                type="number"
                value={lowerBoundX}
                onChange={(e) => setLowerBoundX(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Upper Bound (b)</label>
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
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Lower Bound (a)</label>
              <input
                type="number"
                value={lowerBoundY}
                onChange={(e) => setLowerBoundY(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Upper Bound (b)</label>
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
                value={intervals_x}
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
                value={intervals_y}
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
                <option value="left">Left Endpoint Rule</option>
                <option value="right">Right Endpoint Rule</option>
                <option value="midpoint">Midpoint Rule</option>
                <option value="trapezoid">Trapezoid Rule</option>
                <option value="simpson">Simpson's Rule</option>
              </select>
            </div>
          </div>
        </div>

        {/* TODO: Add your numerical results here */}
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Results</h2>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>

          </div>
        </div>
      </div>

      {/* --- RESULTS PANEL (Desmos Graph) --- */}
      <div>
        <Graph3D expressions={graphExpressions} style={{ height: '500px' }} />
      </div>

    </div>);
}