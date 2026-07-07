import { useState, useMemo } from 'react';
import MathInput from './MathInput';
import Latex from './Latex';
import Graph3D from './Graph3D';
import type { Graph3DExpression } from './Graph3D';
import PrintSettingsModal from './PrintSettingsModal';
import * as math from 'mathjs';

// Inline Icons for better reliability
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const CalculatorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
);

const PrinterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);

export default function VolumeRotationWidget() {
    const [latexFunc, setLatexFunc] = useState('\\sqrt{x}');
    const [asciiFunc, setAsciiFunc] = useState('sqrt(x)');

    const [innerFunction, setInnerFunction] = useState(false);

    const [latexFuncInner, setLatexFuncInner] = useState('0');
    const [asciiFuncInner, setAsciiFuncInner] = useState('0');

    const [lowerBoundLatex, setLowerBoundLatex] = useState('0');
    const [lowerBoundAscii, setLowerBoundAscii] = useState('0');
    const [upperBoundLatex, setUpperBoundLatex] = useState('4');
    const [upperBoundAscii, setUpperBoundAscii] = useState('4');

    const lowerBound = useMemo(() => { try { const val = math.evaluate(lowerBoundAscii); return typeof val === 'number' && !isNaN(val) ? val : 0; } catch { return 0; } }, [lowerBoundAscii]);
    const upperBound = useMemo(() => { try { const val = math.evaluate(upperBoundAscii); return typeof val === 'number' && !isNaN(val) ? val : 4; } catch { return 4; } }, [upperBoundAscii]);

    const [axis, setAxis] = useState<'x' | 'y'>('x');
    const [method, setMethod] = useState<'disk' | 'shell'>('disk');
    const [divisions, setDivisions] = useState(12);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [showApproximation, setShowApproximation] = useState(true);

    const calculatedVolume = useMemo(() => {
        if (asciiFunc) {
            try {
                const f = math.compile(asciiFunc);
                const g = math.compile(asciiFuncInner || '0');
                const a = lowerBound;
                const b = upperBound;
                const n = 1000;
                const dx = (b - a) / n;

                let sum = 0;
                for (let i = 0; i < n; i++) {
                    const x = a + (i + 0.5) * dx;

                    let yOuter = 0;
                    try {
                        yOuter = f.evaluate({ x });
                        if (isNaN(yOuter) || !isFinite(yOuter)) yOuter = 0;
                    } catch (e) { }

                    let yInner = 0;
                    try {
                        yInner = g.evaluate({ x });
                        if (isNaN(yInner) || !isFinite(yInner)) yInner = 0;
                    } catch (e) { }

                    if (axis === 'x') {
                        if (method === 'disk') {
                            sum += (Math.pow(yOuter, 2) - Math.pow(yInner, 2)) * dx;
                        } else {
                            sum += 2 * x * Math.abs(yOuter - yInner) * dx;
                        }
                    } else {
                        if (method === 'shell') {
                            sum += 2 * x * Math.abs(yOuter - yInner) * dx;
                        } else {
                            sum += (Math.pow(yOuter, 2) - Math.pow(yInner, 2)) * dx;
                        }
                    }
                }

                const volumeVal = Math.PI * sum;
                if (!isNaN(volumeVal) && isFinite(volumeVal)) return volumeVal;
            } catch (e) { }
        }
        return 0;
    }, [asciiFunc, asciiFuncInner, lowerBound, upperBound, method, axis]);

    const graphExpressions = useMemo<Graph3DExpression[]>(() => {
        const exprs: Graph3DExpression[] = [];
        if (asciiFunc) {
            exprs.push({
                id: 'revolution_solid',
                latex: asciiFunc,
                latexInner: asciiFuncInner === '0' ? undefined : asciiFuncInner,
                color: '#7c6fff',
                meshStyle: 'REVOLUTION',
                xMin: lowerBound,
                xMax: upperBound,
                slices: divisions,
                method: method,
                axis: axis,
                showApproximation: showApproximation
            });
        }
        return exprs;
    }, [asciiFunc, asciiFuncInner, lowerBound, upperBound, divisions, method, axis, showApproximation]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: 'var(--space-2xl)' }}>
            <div className="responsive-grid" style={{ alignItems: 'stretch' }}>

                {/* --- LEFT: CONTROLS --- */}
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-lg)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SettingsIcon />
                        Configuration
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <MathInput
                            label="Outer Function f(x)"
                            value={latexFunc}
                            onChange={(latex, ascii) => {
                                setLatexFunc(latex);
                                setAsciiFunc(ascii);
                            }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-subtle)' }}>
                            <input
                                type="checkbox"
                                checked={innerFunction}
                                onChange={(e) => setInnerFunction(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                            />
                            Include Inner Function g(x)
                        </label>

                        {innerFunction && (
                            <div style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}>
                                <MathInput
                                    label="Inner Function g(x)"
                                    value={latexFuncInner}
                                    onChange={(latex, ascii) => {
                                        setLatexFuncInner(latex);
                                        setAsciiFuncInner(ascii);
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <MathInput
                                    label="Lower Bound (a)"
                                    value={lowerBoundLatex}
                                    onChange={(latex, ascii) => {
                                        setLowerBoundLatex(latex);
                                        setLowerBoundAscii(ascii);
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <MathInput
                                    label="Upper Bound (b)"
                                    value={upperBoundLatex}
                                    onChange={(latex, ascii) => {
                                        setUpperBoundLatex(latex);
                                        setUpperBoundAscii(ascii);
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Axis of Rotation</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setAxis('x')}
                                    className={`filter-chip ${axis === 'x' ? 'filter-chip--active' : ''}`}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    X-Axis (y=0)
                                </button>
                                <button
                                    onClick={() => setAxis('y')}
                                    className={`filter-chip ${axis === 'y' ? 'filter-chip--active' : ''}`}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    Y-Axis (x=0)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-subtle)' }}>Method</label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value as 'disk' | 'shell')}
                                className="search-input"
                                style={{ paddingLeft: '14px', width: '100%', cursor: 'pointer' }}
                            >
                                <option value="disk">Disk/Washer Method</option>
                                <option value="shell">Cylindrical Shell Method</option>
                            </select>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={showApproximation}
                                    onChange={(e) => setShowApproximation(e.target.checked)}
                                    style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                                />
                                Show Approximation Slices
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Resolution (N)</span>
                                <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '700' }}>{divisions}</span>
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

                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalculatorIcon />
                            Results
                        </h3>
                        <div style={{
                            background: 'rgba(232, 121, 249, 0.04)',
                            border: '1px solid rgba(232, 121, 249, 0.15)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-accent)', textTransform: 'uppercase' }}>Calculated Volume</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', fontFamily: 'var(--font-mono)' }}>
                                    {calculatedVolume.toFixed(6)}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    ≈ {(calculatedVolume / Math.PI).toFixed(4)}π
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: 3D VISUALIZER --- */}
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    height: '100%',
                    minHeight: '550px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="hover-bright"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <PrinterIcon />
                            3D Print Export
                        </button>
                    </div>
                    <Graph3D expressions={graphExpressions} style={{ height: '100%', minHeight: '550px', border: 'none' }} />
                </div>

            </div>

            {/* --- THEORY CARD --- */}
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
                    <BookOpenIcon />
                    Understanding Volume of Rotation
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: 'rgba(232, 121, 249, 0.03)', borderLeft: '3px solid var(--color-accent)', padding: '10px 14px', borderRadius: '4px' }}>
                            <strong style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                                💡 Intuition: {method === 'disk' ? (innerFunction ? "Concentric Washers" : "Slicing Salami") : "Russian Nesting Dolls"}
                            </strong>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                                {method === 'disk'
                                    ? (innerFunction
                                        ? "Imagine slicing a hollow cylinder into flat circular washers with a hole in the center. Each washer has an outer radius R and an inner radius r, with a thin thickness dx. Adding their volumes yields the total hollow volume!"
                                        : "Imagine slicing a sausage or salami into thin flat circular coins. Each circular slice represents a cylinder of radius R and thickness dx. By adding up the volumes of these coins, we get the total solid volume!"
                                    )
                                    : "Imagine a set of hollow cylinders nested perfectly inside one another like nesting dolls. Each shell has a radius R, a height H, and an incredibly thin thickness dx. Adding their thin volumes gives the total solid volume!"
                                }
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>The definite integral for rotation around the X-Axis is:</p>
                        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
                            {method === 'disk' ? (
                                innerFunction ? (
                                    <Latex math="V = \pi \int_{a}^{b} \left( [f(x)]^2 - [g(x)]^2 \right) \, dx" block />
                                ) : (
                                    <Latex math="V = \pi \int_{a}^{b} [f(x)]^2 \, dx" block />
                                )
                            ) : (
                                innerFunction ? (
                                    <Latex math="V = 2\pi \int_{a}^{b} x \cdot (f(x) - g(x)) \, dx" block />
                                ) : (
                                    <Latex math="V = 2\pi \int_{a}^{b} x \cdot f(x) \, dx" block />
                                )
                            )}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 16px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '13px', color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <InfoIcon />
                                Pro-Tip: Method Selection
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                                Use the <strong>Disk/Washer method</strong> when your slices are perpendicular to the axis of rotation. 
                                Use the <strong>Shell method</strong> when your shells are parallel to the axis of rotation. 
                                Sometimes one method results in a much simpler integral than the other!
                            </p>
                        </div>
                        <div style={{ background: 'rgba(124, 111, 255, 0.03)', borderLeft: '3px solid #7c6fff', padding: '10px 14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#7c6fff', fontSize: '13px', display: 'block', marginBottom: '4px' }}>🔑 Numerical Precision</strong>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                                This tool uses midpoint Riemann integration with 1000 subintervals for high accuracy. 
                                The 3D visualization is a discrete approximation controlled by the "Resolution" slider above.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {isPrintModalOpen && (
                <PrintSettingsModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    asciiFunc={asciiFunc}
                    lowerBoundX={String(lowerBound)}
                    upperBoundX={String(upperBound)}
                    lowerBoundY={String(-upperBound)}
                    upperBoundY={String(upperBound)}
                    intervalsX={String(divisions)}
                    intervalsY={String(divisions)}
                    method={method}
                />
            )}
        </div>
    );
}
