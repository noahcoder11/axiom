import { useState, useMemo } from 'react';
import * as math from 'mathjs';
import MathInput from './MathInput';
import DesmosGraph, { type DesmosExpression } from './DesmosGraph';

export default function IntegrationWidget2D() {

  const [latexFunc, setLatexFunc] = useState('x^2');
  const [asciiFunc, setAsciiFunc] = useState('x^2');

  const [lowerBound, setLowerBound] = useState('0');
  const [upperBound, setUpperBound] = useState('1');
  const [intervals, setIntervals] = useState('10');
  const [method, setMethod] = useState('midpoint');

  // --- Desmos Expressions Sync ---
  // Here we dynamically construct the expressions we want Desmos to graph
  const desmosExpressions = useMemo<DesmosExpression[]>(() => {
    const exprs: DesmosExpression[] = [];

    // 1. Plot the main function
    if (latexFunc) {
      exprs.push({
        id: 'f',
        latex: `f(x)=${latexFunc}`,
        color: '#7c6fff', // Axiom accent color
      });

      // 2. Plot the exact integral (shaded region under the curve)
      if (lowerBound && upperBound && !isNaN(Number(lowerBound)) && !isNaN(Number(upperBound))) {
        exprs.push({
          id: 'integral_fill',
          latex: `0 \\le y \\le f(x) \\left\\{${lowerBound} \\le x \\le ${upperBound}\\right\\}`,
          color: '#7c6fff',
          fillOpacity: 0.2,
          lines: false // don't draw boundaries
        });
      }

      // 3. Plot the rectangles/trapezoids for the chosen approximation method
      if (asciiFunc && !isNaN(Number(lowerBound)) && !isNaN(Number(upperBound)) && !isNaN(Number(intervals))) {
        try {
          const f = math.compile(asciiFunc);
          const a = Number(lowerBound);
          const b = Number(upperBound);
          const n = Number(intervals);
          const dx = (b - a) / n;

          for (let i = 0; i < n; i++) {
            const x0 = a + i * dx;
            const x1 = a + (i + 1) * dx;

            switch (method) {
              case 'left': {
                const y0 = f.evaluate({ x: x0 });
                exprs.push({
                  id: `rect_${i}`,
                  latex: `\\operatorname{polygon}((${x0}, 0), (${x1}, 0), (${x1}, ${y0}), (${x0}, ${y0}))`,
                  color: '#e879f9',
                  fillOpacity: 0.3
                });
                break;
              }
              case 'right': {
                const y1 = f.evaluate({ x: x1 });
                exprs.push({
                  id: `rect_${i}`,
                  latex: `\\operatorname{polygon}((${x0}, 0), (${x1}, 0), (${x1}, ${y1}), (${x0}, ${y1}))`,
                  color: '#e879f9',
                  fillOpacity: 0.3
                });
                break;
              }
              case 'midpoint': {
                const xMid = (x0 + x1) / 2;
                const yMid = f.evaluate({ x: xMid });
                exprs.push({
                  id: `rect_${i}`,
                  latex: `\\operatorname{polygon}((${x0}, 0), (${x1}, 0), (${x1}, ${yMid}), (${x0}, ${yMid}))`,
                  color: '#e879f9',
                  fillOpacity: 0.3
                });
                break;
              }
              case 'trapezoid': {
                const y0 = f.evaluate({ x: x0 });
                const y1 = f.evaluate({ x: x1 });
                exprs.push({
                  id: `trap_${i}`,
                  latex: `\\operatorname{polygon}((${x0}, 0), (${x1}, 0), (${x1}, ${y1}), (${x0}, ${y0}))`,
                  color: '#e879f9',
                  fillOpacity: 0.3
                });
                break;
              }
              case 'simpson': {
                // Simpson's rule uses parabolas over pairs of intervals.
                // We only want to draw one parabola for every TWO intervals (i.e. when i is even).
                if (i % 2 === 0 && i < n - 1) {
                  const x2 = a + (i + 2) * dx;
                  const y0 = f.evaluate({ x: x0 });
                  const y1 = f.evaluate({ x: x1 });
                  const y2 = f.evaluate({ x: x2 });

                  // 2nd order Lagrange polynomial
                  const p_ = `(x - ${x1}) * (x - ${x2}) / ((${x0} - ${x1}) * (${x0} - ${x2})) * ${y0} + (x - ${x0}) * (x - ${x2}) / ((${x1} - ${x0}) * (${x1} - ${x2})) * ${y1} + (x - ${x0}) * (x - ${x1}) / ((${x2} - ${x0}) * (${x2} - ${x1})) * ${y2}`;

                  // Restrict the domain of the parabola so it only draws between x0 and x2
                  exprs.push({
                    id: `simpson_${i}`,
                    latex: `0 \\le y \\le ${p_} \\left\\{${x0} \\le x \\le ${x2}\\right\\}`,
                    color: '#e879f9',
                    fillOpacity: 0.3,
                    lines: true
                  });
                } else if (i === n - 1 && n % 2 !== 0) {
                  // If n is odd, the last single interval doesn't have a pair to make a parabola.
                  // The standard fallback is to use the Trapezoidal rule for this final interval.
                  const y0 = f.evaluate({ x: x0 });
                  const y1 = f.evaluate({ x: x1 });
                  exprs.push({
                    id: `simpson_fallback_${i}`,
                    latex: `\\operatorname{polygon}((${x0}, 0), (${x1}, 0), (${x1}, ${y1}), (${x0}, ${y0}))`,
                    color: '#e879f9',
                    fillOpacity: 0.3
                  });
                }
                break;
              }
            }
          }
        } catch (e) {
          // If the math expression is invalid, don't crash
        }
      }
    }

    return exprs;
  }, [latexFunc, asciiFunc, lowerBound, upperBound, intervals, method]);

  const approximation = useMemo(() => {
    if (latexFunc && lowerBound && upperBound && intervals && method && asciiFunc) {
      try {
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
      } catch (e) {
        // Invalid expression while typing, ignore
      }
    }
    return undefined;
  }, [latexFunc, asciiFunc, lowerBound, upperBound, intervals, method]);

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


  return (
    <div style={{ display: 'grid', gap: 'var(--space-lg)', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 2fr)' }}>

      {/* --- INPUT PANEL --- */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', height: 'fit-content' }}>
        <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Parameters</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <MathInput
            label="Function f(x)"
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
                value={lowerBound}
                onChange={(e) => setLowerBound(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Upper Bound (b)</label>
              <input
                type="number"
                value={upperBound}
                onChange={(e) => setUpperBound(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <div style={{ flex: 1 }}>
              <label className="math-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Intervals (n)</label>
              <input
                type="number"
                value={intervals}
                onChange={(e) => setIntervals(e.target.value)}
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
            Approximate Integral: {approximation?.toFixed(10)}<br />
            Actual Value: {exactResult?.toFixed(10)}
          </div>
        </div>
      </div>

      {/* --- RESULTS PANEL (Desmos Graph) --- */}
      <div>
        <DesmosGraph expressions={desmosExpressions} style={{ height: '500px' }} />
      </div>

    </div>);
}