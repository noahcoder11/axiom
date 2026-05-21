import { useState, useMemo } from 'react';
import * as math from 'mathjs';
import MathInput from './MathInput';
import DesmosGraph, { type DesmosExpression } from './DesmosGraph';
import Latex from './Latex';

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
                    Riemann Area Approximation
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
                  Exact Area (Definite Integral)
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

        {/* --- RESULTS PANEL (Desmos Graph) --- */}
        <div style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid var(--color-border)',
          height: '100%',
          minHeight: '550px'
        }}>
          <DesmosGraph expressions={desmosExpressions} style={{ height: '100%', minHeight: '550px' }} />
        </div>

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
          Understanding the Mathematics
        </h3>

        {method === 'left' && (
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Left Riemann Sum (Left Endpoint Rule)</h4>

            {/* Plain English Main Idea */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: Step-Like Blocks</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Riemann sums estimate the area under a curve using flat rectangular boxes. It's like building a LEGO staircase to fit a smooth curved hill! Since we evaluate the curve at the <strong>left edge</strong> of each block, the heights of our rectangles follow the curve's left-hand values.
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              The mathematical formula for the Left Riemann Sum is:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="L_n = \sum_{i=0}^{n-1} f(x_i) \Delta x" block />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where the width is <Latex math="\Delta x = \frac{b - a}{n}" /> and the evaluation grid points are <Latex math="x_i = a + i\Delta x" /> for <Latex math="i = 0, 1, \dots, n-1" />.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }}>
              <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '6px' }}>❔ Common Question: When does the Left Sum over- or under-estimate?</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                If the function is <strong>increasing</strong> (climbing up from left to right), the left endpoint will always be the lowest point on each subinterval. Thus, the rectangles will sit entirely below the curve, resulting in an <strong>underestimate</strong>! Conversely, if the function is <strong>decreasing</strong> (sloping down), the left endpoint is the highest point, leading to an <strong>overestimate</strong>.
              </p>
            </div>

            <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px', margin: '10px 0' }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Key Takeaway: Linear Convergence</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                The error decreases linearly, represented as <Latex math="O(h)" />. This means that if you want to cut your approximation error in half, you have to double the number of subintervals (e.g., from 10 to 20). If you want 10x more accuracy, you need 10x more intervals! This makes it great for learning, but too slow for high-precision scientific integration.
              </span>
            </div>
          </div>
        )}

        {method === 'right' && (
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Right Riemann Sum (Right Endpoint Rule)</h4>

            {/* Plain English Main Idea */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: The Mirror Staircase</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Just like the Left Sum, the Right Endpoint Rule builds a staircase of flat boxes. However, instead of evaluating the height at the left edge of each block, we use the <strong>right edge</strong>. This simple swap mirrors how the blocks align with the curve!
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              The mathematical formula for the Right Riemann Sum is:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="R_n = \sum_{i=1}^{n} f(x_i) \Delta x" block />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where the width is <Latex math="\Delta x = \frac{b - a}{n}" /> and the evaluation grid points are <Latex math="x_i = a + i\Delta x" /> for <Latex math="i = 1, 2, \dots, n" />.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }}>
              <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '6px' }}>❔ Common Question: How does the Right Sum compare to the Left Sum?</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                For an <strong>increasing</strong> function, the Right Sum will always be an <strong>overestimate</strong> (the boxes stick out above the curve). For a <strong>decreasing</strong> function, it will be an <strong>underestimate</strong>. This means the true definite integral is guaranteed to sit somewhere between the Left and Right sums—giving you a perfect mathematical boundary range!
              </p>
            </div>

            <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px', margin: '10px 0' }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Key Takeaway: First-Order Accuracy</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Just like the Left Endpoint Rule, the Right Sum converges at a linear rate of <Latex math="O(h)" />. It requires a very large number of intervals to achieve high precision, making it an excellent conceptual starting point before upgrading to slanted or curved rules!
              </span>
            </div>
          </div>
        )}

        {method === 'midpoint' && (
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Midpoint Riemann Sum</h4>

            {/* Plain English Main Idea */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: The Balancing Act</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Instead of choosing the absolute left or right edge of a subinterval, we evaluate the curve at the <strong>exact center</strong> of each block. This creates rectangles that are slightly too tall on one side, but slightly too short on the other. Amazingly, these errors tend to cancel each other out!
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              The mathematical formula for the Midpoint Rule is:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="M_n = \sum_{i=0}^{n-1} f\left(\frac{x_i + x_{i+1}}{2}\right) \Delta x" block />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where <Latex math="\Delta x = \frac{b - a}{n}" /> and the subinterval grid coordinates are <Latex math="x_i = a + i\Delta x" />. The evaluation coordinate simplifies to <Latex math="x_{\text{mid}} = a + (i + 0.5)\Delta x" />.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }}>
              <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '6px' }}>❔ Common Question: Why is the Midpoint Rule so much more accurate than Left or Right sums?</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                Look closely at a single midpoint rectangle. Since the top of the box is flat, the triangular sliver of "extra space" above the curve on one half is nearly equal in size to the triangular sliver of "missing space" below the curve on the other half. Because these positive and negative errors balance each other, the Midpoint Rule is dramatically more precise!
              </p>
            </div>

            <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px', margin: '10px 0' }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Key Takeaway: Second-Order Convergence</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Even though the Midpoint Rule still uses flat-topped boxes, its clever error-cancellation gives it <strong>quadratic convergence</strong> (<Latex math="O(h^2)" />)—the exact same order of accuracy as the Trapezoidal Rule! If you double the number of subintervals (cutting <Latex math="h" /> in half), your overall error is cut by a factor of <strong>4</strong>!
              </span>
            </div>
          </div>
        )}

        {method === 'trapezoid' && (
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Trapezoidal Rule (Linear Spline Approximation)</h4>

            {/* Plain English Main Idea */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: Straight Slanted Connectors</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Instead of using flat boxes to estimate the area under a curve, we connect our data points with <strong>straight slanted lines</strong>, forming a series of trapezoids. Because these lines can follow the slope of the curve, they reduce approximation error drastically compared to standard rectangular sums!
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              The formula for the Composite Trapezoidal Rule is:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="T_n = \frac{\Delta x}{2} \left[ f(x_0) + 2f(x_1) + 2f(x_2) + \dots + 2f(x_{n-1}) + f(x_n) \right]" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where <Latex math="\Delta x = \frac{b - a}{n}" /> and <Latex math="x_i = a + i\Delta x" />.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }}>
              <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '6px' }}>❔ Common Question: Why do internal points have a "2" coefficient, but endpoints do not?</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                Think of each subinterval as its own trapezoid. The area of a trapezoid is the average height times the width: <Latex math="\text{Area} = \Delta x \frac{y_{\text{left}} + y_{\text{right}}}{2}" />. When you add adjacent trapezoids together, every internal grid line (like <Latex math="x_1, x_2" />) acts as the right side of one trapezoid and the left side of the next one. So, they get counted twice! The outer boundaries <Latex math="x_0" /> and <Latex math="x_n" /> only border a single trapezoid, so they are only counted once.
              </p>
            </div>

            <h5 style={{ color: 'white', margin: '12px 0 6px 0', fontSize: '14px', fontWeight: '600' }}>🔬 Where does the formula come from? (Lagrange Interpolation)</h5>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              We can derive this rule rigorously using <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>Lagrange Interpolating Polynomials (LIPs)</span>. Don't let the name scare you—an LIP is just a generic math recipe for finding a polynomial that passes exactly through a given set of points. For a straight line through two points, we use a first-order LIP:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="L_1(x) = f(x_0) \frac{x-x_1}{x_0-x_1} + f(x_1) \frac{x-x_0}{x_1-x_0}" />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Integrating this line equation from <Latex math="x_0" /> to <Latex math="x_1" /> gives the exact geometric area of a single trapezoid segment:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="\int_{x_0}^{x_1} L_1(x) dx = \frac{\Delta x}{2} (f(x_0) + f(x_1))" />
            </div>

            <h5 style={{ color: 'white', margin: '12px 0 6px 0', fontSize: '14px', fontWeight: '600' }}>📈 Calculating Error & Precision</h5>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              The beauty of the Lagrange derivation is that it gives us a precise way to calculate <strong style={{ color: 'var(--color-accent)' }}>error bounds</strong>. A linear LIP has an error remainder of:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="R_1 = \frac{f''(\xi)}{2} (x - x_0)(x - x_1)" />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Integrating this remainder term yields the local error of a single subinterval:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="R_{T} = -\frac{h^3}{12} f''(\xi)" />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Summing the error across all <Latex math="n" /> intervals gives the Composite Trapezoidal error bound:
            </p>

            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="R_{CT} = -\frac{b-a}{12} h^2 f''(\xi) = O(h^2)" />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where <Latex math="\xi \in [a, b]" /> and <Latex math="h = \frac{b-a}{n}" /> is the step width.
            </p>

            <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px', margin: '10px 0' }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Key Takeaway: Quadratic Convergence</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                The error term is written as <Latex math="O(h^2)" />, which means the error decreases <strong>quadratically</strong> as you add more intervals. If you double the number of subintervals (cutting <Latex math="h" /> in half), your overall approximation error is cut by a factor of 4! This is a massive improvement over Riemann endpoint sums, which only decrease error linearly (doubling intervals only cuts error by 2).
              </span>
            </div>
          </div>
        )}

        {method === 'simpson' && (
          <div>
            <h4 style={{ color: '#e879f9', margin: 'var(--space-xs) 0', fontSize: '15px', fontWeight: '600' }}>Simpson's Rule (Parabolic Spline Approximation)</h4>

            {/* Plain English Main Idea */}
            <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid #e879f9', padding: '10px 14px', borderRadius: '4px', margin: '8px 0' }}>
              <strong style={{ color: '#e879f9', fontSize: '13px', display: 'block', marginBottom: '4px' }}>💡 Intuition Check: Smooth Curved Connectors</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                If straight slanted lines (Trapezoidal Rule) fit curves better than flat rectangular boxes, what if we use <strong>curved lines</strong> instead? Simpson's Rule fits smooth quadratic parabolas to sets of three points at a time. Because curves match natural functions much better than straight lines, Simpson's Rule achieves incredible precision!
              </span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Because it fits parabolas across pairs of intervals, Simpson's Rule requires the total number of subintervals <Latex math="n" /> to be an <strong>even integer</strong>:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="S_n = \frac{h}{3} \left[ f(x_0) + 4f(x_1) + 2f(x_2) + 4f(x_3) + \dots + 4f(x_{n-1}) + f(x_n) \right]" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where <Latex math="h = \Delta x = \frac{b - a}{n}" />.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }}>
              <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '6px' }}>❔ Common Question: Why does the formula alternate weights like 1, 4, 2, 4, ..., 4, 1?</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                Simpson's Rule pairs subintervals to draw parabolic arches.
                <br />• The <strong>midpoints</strong> of each parabolic arch are unique to that arch, and the math assigns them a weight coefficient of <strong>4</strong>.
                <br />• The <strong>boundary points</strong> where adjacent arches touch are shared by two parabolas, so they get added twice: <Latex math="1 + 1 = 2" /> times.
                <br />• The very <strong>endpoints</strong> (<Latex math="x_0, x_n" />) only belong to a single outer arch, so they are only counted once (<strong>1</strong>).
              </p>
            </div>

            <h5 style={{ color: 'white', margin: '12px 0 6px 0', fontSize: '14px', fontWeight: '600' }}>🔬 Where does the formula come from? (Lagrange Interpolation)</h5>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              We fit a second-order (quadratic) <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>Lagrange Interpolating Polynomial</span> through three adjacent points <Latex math="(x_{2i}, f(x_{2i}))" />, <Latex math="(x_{2i+1}, f(x_{2i+1}))" />, and <Latex math="(x_{2i+2}, f(x_{2i+2}))" />, where <Latex math="x_{2i+1}" /> is the midpoint:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="L_2(x) = f(x_{2i}) \ell_{0,2}(x) + f(x_{2i+1}) \ell_{1,2}(x) + f(x_{2i+2}) \ell_{2,2}(x)" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where the quadratic basis coefficients are:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="\ell_{0,2}(x) = \frac{(x-x_{2i+1})(x-x_{2i+2})}{2h^2}, \quad \ell_{1,2}(x) = -\frac{(x-x_{2i})(x-x_{2i+2})}{h^2}, \quad \ell_{2,2}(x) = \frac{(x-x_{2i})(x-x_{2i+1})}{2h^2}" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Integrating this parabola <Latex math="L_2(x)" /> across the double subinterval yields the local integration area:
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="\int_{x_{2i}}^{x_{2i+2}} L_2(x) dx = \frac{h}{3} \left( f(x_{2i}) + 4f(x_{2i+1}) + f(x_{2i+2}) \right)" />
            </div>

            <h5 style={{ color: 'white', margin: '12px 0 6px 0', fontSize: '14px', fontWeight: '600' }}>📈 The "Magic" of Simpson's Rule & Error Bounds</h5>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Normally, a quadratic polynomial interpolation has an error term related to the third derivative of the function (<Latex math="f^{(3)}" />). However, because the midpoint <Latex math="x_{2i+1}" /> is perfectly centered between the boundary points, the cubic error term cancels out completely when integrated!
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="\int_{x_{2i}}^{x_{2i+2}} (x-x_{2i})(x-x_{2i+1})(x-x_{2i+2}) \, dx = 0" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Because of this beautiful symmetry, <strong>Simpson's Rule is perfectly exact for cubic polynomials (degree 3) as well as quadratics (degree 2)</strong>!
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              Its actual leading error term is tied to the fourth derivative (<Latex math="f^{(4)}" />):
            </p>
            <div style={{ padding: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center' }}>
              <Latex math="R_{CS} = -\frac{b-a}{180} h^4 f^{(4)}(\xi) = O(h^4)" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: '4px 0' }}>
              where <Latex math="\xi \in [a, b]" /> and <Latex math="h = \frac{b-a}{n}" />.
            </p>

            <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px', margin: '10px 0' }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Key Takeaway: Fourth-Order Convergence</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                The error decreases as <strong><Latex math="O(h^4)" /></strong>. If you double the number of subintervals, your error drops by an outstanding factor of <strong>16</strong> (<Latex math="2^4 = 16" />)! This exceptionally high convergence rate makes Simpson's Rule one of the most powerful and popular algorithms for smooth scientific numerical integration.
              </span>
            </div>

            <div style={{
              background: 'rgba(251, 191, 36, 0.03)',
              border: '1px dashed rgba(251, 191, 36, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0 10px 0'
            }}>
              <strong style={{ color: '#fbbf24', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                🚀 Fun Fact: The Magic of Richardson's Extrapolation
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '4px 0' }}>
                Imagine you have two slightly blurry photos of the same object taken from different distances. By combining them mathematically, could you generate a perfectly sharp, high-resolution image?
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '6px 0' }}>
                That is the core intuition behind <strong>Richardson's Extrapolation</strong>! If we have an approximation formula (like the Trapezoidal Rule) with a known error structure of <Latex math="O(h^2)" />, we can compute two separate estimates: one with a wide step size <Latex math="h" />, and another with half that step size <Latex math="h/2" />.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '6px 0' }}>
                By cleverly combining them, we can algebraically cancel out the dominant <Latex math="h^2" /> error term entirely:
              </p>
              <div style={{ padding: 'var(--space-xs) 0', display: 'flex', justifyContent: 'center' }}>
                <Latex math="I_{\text{boosted}} = \frac{4 T(h/2) - T(h)}{3}" block />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '6px 0' }}>
                <strong>The mind-blowing connection:</strong> If you take the Trapezoidal Rule <Latex math="T(h)" /> and apply this extrapolation formula, the result is <strong>exactly equivalent to Simpson's Rule!</strong>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '4px 0 0 0' }}>
                If you keep repeating this process to eliminate even higher-order error terms (<Latex math="h^4, h^6, \dots" />), you get an extremely powerful algorithm called <strong>Romberg Integration</strong>. You've just unlocked a major secret of numerical analysis!
              </p>
            </div>
          </div>
        )}
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