import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as math from 'mathjs';
import { STLExporter } from 'three-stdlib';

const FILAMENT_COLORS = [
  { name: 'Silk Silver', value: '#d1d5db', roughness: 0.15, metalness: 0.8 },
  { name: 'Matte Black', value: '#1f2937', roughness: 0.85, metalness: 0.1 },
  { name: 'Bambu Orange', value: '#ea580c', roughness: 0.35, metalness: 0.15 },
  { name: 'Ruby Red', value: '#dc2626', roughness: 0.25, metalness: 0.25 },
  { name: 'Electric Blue', value: '#2563eb', roughness: 0.2, metalness: 0.4 },
  { name: 'Emerald Green', value: '#059669', roughness: 0.3, metalness: 0.2 }
];

interface VolumePrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  latexFunc: string;
  latexFuncInner?: string;
  lowerBound: number;
  upperBound: number;
  parsedAxis: { type: 'horizontal' | 'vertical', value: number };
}

function SolidRotationPrintMesh({
  latex,
  latexInner,
  xMin,
  xMax,
  scale,
  parsedAxis,
  color,
  roughness,
  metalness,
  slices,
  isApproximation
}: {
  latex: string;
  latexInner?: string;
  xMin: number;
  xMax: number;
  scale: number;
  parsedAxis: { type: 'horizontal' | 'vertical', value: number };
  color: string;
  roughness: number;
  metalness: number;
  slices: number;
  isApproximation: boolean;
}) {
  const compiled = useMemo(() => {
    try { return latex ? math.compile(latex) : null; } catch (e) { return null; }
  }, [latex]);

  const compiledInner = useMemo(() => {
    try { return latexInner && latexInner !== '0' ? math.compile(latexInner) : null; } catch (e) { return null; }
  }, [latexInner]);

  const n = slices;
  const a = xMin;
  const b = xMax;
  const dx = (b - a) / n;

  const approximationGeometries = useMemo(() => {
    if (!isApproximation || !compiled) return [];
    
    const geoms: { geom: THREE.LatheGeometry, pos: [number, number, number], rot: [number, number, number] }[] = [];
    
    for (let i = 0; i < n; i++) {
      const xStart = a + i * dx;
      const xEnd = a + (i + 1) * dx;
      const xMid = (xStart + xEnd) / 2;

      let yOuter = 0;
      let yInner = 0;

      try {
        yOuter = compiled.evaluate({ x: xMid });
        if (compiledInner) yInner = compiledInner.evaluate({ x: xMid });
      } catch (e) { }

      let radius = yOuter - parsedAxis.value;
      let radiusInner = yInner - parsedAxis.value;

      if (Math.abs(radiusInner) > Math.abs(radius)) {
          const temp = radius;
          radius = radiusInner;
          radiusInner = temp;
      }
      
      radius = Math.abs(radius);
      radiusInner = Math.abs(radiusInner);

      const pts: THREE.Vector2[] = [];

      if (parsedAxis.type === 'horizontal') {
        pts.push(new THREE.Vector2(radiusInner * scale, xStart * scale));
        pts.push(new THREE.Vector2(radius * scale, xStart * scale));
        pts.push(new THREE.Vector2(radius * scale, xEnd * scale));
        pts.push(new THREE.Vector2(radiusInner * scale, xEnd * scale));
        pts.push(new THREE.Vector2(radiusInner * scale, xStart * scale));

        geoms.push({
            geom: new THREE.LatheGeometry(pts, 32),
            pos: [0, parsedAxis.value * scale, 0],
            rot: [Math.PI / 2, 0, 0] // Rotate to sit on print bed Z=0
        });
      } else {
        const vRadiusStart = Math.abs(xStart - parsedAxis.value) * scale;
        const vRadiusEnd = Math.abs(xEnd - parsedAxis.value) * scale;
        
        let h1 = yInner * scale;
        let h2 = yOuter * scale;

        if (h1 > h2) {
            const temp = h1;
            h1 = h2;
            h2 = temp;
        }
        
        pts.push(new THREE.Vector2(vRadiusStart, h1));
        pts.push(new THREE.Vector2(vRadiusEnd, h1));
        pts.push(new THREE.Vector2(vRadiusEnd, h2));
        pts.push(new THREE.Vector2(vRadiusStart, h2));
        pts.push(new THREE.Vector2(vRadiusStart, h1));
        
        geoms.push({
            geom: new THREE.LatheGeometry(pts, 32),
            pos: [parsedAxis.value * scale, 0, 0],
            rot: [Math.PI / 2, 0, 0] // Rotate to sit on print bed Z=0
        });
      }
    }
    
    // Shift all geometries so they rest on Z=0
    let minZ = Infinity;
    geoms.forEach(g => {
        g.geom.computeBoundingBox();
        if (g.geom.boundingBox) {
            const zMin = g.geom.boundingBox.min.y; // Before rotation, Y is the height
            if (zMin < minZ) minZ = zMin;
        }
    });
    
    if (minZ !== Infinity && minZ !== 0) {
        geoms.forEach(g => {
            if (parsedAxis.type === 'horizontal') {
                g.pos[1] -= minZ; 
            } else {
                g.pos[1] -= minZ;
            }
        });
    }

    return geoms;
  }, [isApproximation, compiled, compiledInner, n, a, dx, scale, parsedAxis]);

  const smoothGeometry = useMemo(() => {
    if (isApproximation || !compiled) return null;
    const points: THREE.Vector2[] = [];
    const smoothN = 64;
    const smoothDx = (b - a) / smoothN;
    
    const outerCurve: THREE.Vector2[] = [];
    const innerCurve: THREE.Vector2[] = [];

    for (let i = 0; i <= smoothN; i++) {
      const x = a + i * smoothDx;
      let y = 0; 
      let yIn = 0;
      try { 
          y = compiled.evaluate({ x }); 
          if (compiledInner) yIn = compiledInner.evaluate({ x });
      } catch (e) { }
      
      let radiusOuter = y - parsedAxis.value;
      let radiusInner = yIn - parsedAxis.value;
      
      if (Math.abs(radiusInner) > Math.abs(radiusOuter)) {
          const temp = radiusOuter;
          radiusOuter = radiusInner;
          radiusInner = temp;
      }
      
      radiusOuter = Math.abs(radiusOuter);
      radiusInner = Math.abs(radiusInner);

      if (parsedAxis.type === 'horizontal') {
         outerCurve.push(new THREE.Vector2(radiusOuter * scale, x * scale));
         innerCurve.push(new THREE.Vector2(radiusInner * scale, x * scale));
      } else {
         const vRadius = Math.abs(x - parsedAxis.value) * scale;
         let h1 = yIn * scale;
         let h2 = y * scale;
         if (h1 > h2) {
             const temp = h1;
             h1 = h2;
             h2 = temp;
         }
         outerCurve.push(new THREE.Vector2(vRadius, h2));
         innerCurve.push(new THREE.Vector2(vRadius, h1));
      }
    }
    
    points.push(...outerCurve);
    points.push(...innerCurve.reverse());
    points.push(outerCurve[0]);

    const geom = new THREE.LatheGeometry(points, 64);
    
    geom.computeBoundingBox();
    if (geom.boundingBox) {
        const minZ = geom.boundingBox.min.y; // height is along Y in Lathe
        geom.translate(0, -minZ, 0); // Translate so it rests on Y=0 before we rotate it
    }

    return geom;
  }, [isApproximation, compiled, compiledInner, a, b, scale, parsedAxis]);

  if (isApproximation) {
      return (
          <group>
             {approximationGeometries.map((data, idx) => (
                 <mesh key={idx} geometry={data.geom} position={data.pos} rotation={data.rot}>
                     <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={THREE.DoubleSide} />
                 </mesh>
             ))}
          </group>
      );
  }

  if (!isApproximation && smoothGeometry) {
    return (
      <group>
        <mesh 
          geometry={smoothGeometry} 
          rotation={parsedAxis.type === 'horizontal' ? [Math.PI / 2, 0, 0] : [Math.PI / 2, 0, 0]}
          position={parsedAxis.type === 'horizontal' ? [0, 0, parsedAxis.value * scale] : [parsedAxis.value * scale, 0, 0]}
        >
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  return null;
}

export default function VolumePrintSettingsModal({
  isOpen,
  onClose,
  latexFunc,
  latexFuncInner,
  lowerBound,
  upperBound,
  parsedAxis
}: VolumePrintSettingsModalProps) {
  const [scale, setScale] = useState(10); // mm per math unit
  const [colorIndex, setColorIndex] = useState(2);
  const [isApproximation, setIsApproximation] = useState(false);
  const [slices, setSlices] = useState(12);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const selectedFilament = FILAMENT_COLORS[colorIndex];
  const exportGroupRef = useRef<THREE.Group>(null);

  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    document.documentElement.classList.remove('modal-open');
    setTimeout(() => onClose(), 350);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('modal-open');
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.documentElement.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  const handleExportSTL = () => {
    if (!exportGroupRef.current) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        const group = exportGroupRef.current!;
        const oldRotation = group.rotation.clone();
        group.rotation.set(0, 0, 0); // Reset for STL Z-up
        group.updateMatrixWorld(true);

        const exporter = new STLExporter();
        const stlData = exporter.parse(group, { binary: true }) as DataView;

        group.rotation.copy(oldRotation);
        group.updateMatrixWorld(true);

        const blob = new Blob([stlData.buffer as any], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AXIOM_SOLID_REVOLUTION_SCALE${scale}mm.stl`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert("An error occurred while generating the STL file.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-overlay ${isAnimatingOut ? 'is-closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-md)', boxSizing: 'border-box'
      }}
    >
      <style>{`
        #root { transition: transform 0.4s, filter 0.4s !important; transform-origin: center center; }
        .modal-open #root { transform: scale(0.965) !important; filter: brightness(0.55) blur(10px) !important; pointer-events: none !important; }
        @keyframes modalOverlayFadeIn { from { background-color: rgba(5, 5, 8, 0); backdrop-filter: blur(0px); } to { background-color: rgba(5, 5, 8, 0.7); backdrop-filter: blur(12px); } }
        @keyframes modalOverlayFadeOut { from { background-color: rgba(5, 5, 8, 0.7); backdrop-filter: blur(12px); } to { background-color: rgba(5, 5, 8, 0); backdrop-filter: blur(0px); } }
        @keyframes modalCardAppear { from { opacity: 0; transform: scale(0.9) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalCardDisappear { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(30px); } }
        .modal-overlay { animation: modalOverlayFadeIn 0.4s forwards; }
        .modal-overlay.is-closing { animation: modalOverlayFadeOut 0.35s forwards; }
        .modal-card { animation: modalCardAppear 0.45s both; }
        .modal-card.is-closing { animation: modalCardDisappear 0.35s forwards; }
      `}</style>
      
      <div className={`modal-card ${isAnimatingOut ? 'is-closing' : ''}`} style={{
        width: '100%', maxWidth: '1100px', height: '90vh', maxHeight: '760px',
        background: 'var(--bg-primary)', border: '1px solid var(--color-border)',
        borderRadius: '24px', boxShadow: 'var(--shadow-lg)', display: 'flex', overflow: 'hidden'
      }}>
        <div style={{ flex: '1.2', background: 'var(--bg-tertiary)', position: 'relative', display: 'flex' }}>
          <Canvas camera={{ position: [110, 110, 110], fov: 45 }} style={{ width: '100%', height: '100%' }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[100, 150, 50]} intensity={1.2} castShadow />
            <directionalLight position={[-100, -50, -50]} intensity={0.4} />
            <gridHelper args={[300, 30, '#333344', '#1f1f2e']} position={[0, -0.1, 0]} />
            <group ref={exportGroupRef} rotation={[-Math.PI / 2, 0, 0]}>
              <SolidRotationPrintMesh
                latex={latexFunc}
                latexInner={latexFuncInner}
                xMin={lowerBound}
                xMax={upperBound}
                scale={scale}
                parsedAxis={parsedAxis}
                color={selectedFilament.value}
                roughness={selectedFilament.roughness}
                metalness={selectedFilament.metalness}
                slices={slices}
                isApproximation={isApproximation}
              />
            </group>
            <OrbitControls />
          </Canvas>
        </div>

        <div style={{ flex: '0.8', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
          <div>
            <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>Solid 3D Print Export</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>Configure physical dimensions and export settings for slicing.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-subtle)' }}>Scale (mm per Math Unit)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="1" max="50" step="1" value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold', width: '40px', textAlign: 'right' }}>{scale}</span>
                </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: 'var(--color-text-subtle)' }}>Export Geometry</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsApproximation(false)} className={`filter-chip ${!isApproximation ? 'filter-chip--active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>Smooth Solid</button>
                <button onClick={() => setIsApproximation(true)} className={`filter-chip ${isApproximation ? 'filter-chip--active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>Discrete Slices</button>
              </div>
            </div>

            {isApproximation && (
              <div style={{ animation: 'fadeInUp 0.3s forwards' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-subtle)' }}>Number of Slices (N = {slices})</label>
                <input type="range" min="4" max="64" step="1" value={slices} onChange={(e) => setSlices(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: 'var(--color-text-subtle)' }}>Preview Material</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {FILAMENT_COLORS.map((filament, index) => (
                  <button
                    key={filament.name}
                    onClick={() => setColorIndex(index)}
                    title={filament.name}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: filament.value,
                      border: index === colorIndex ? '2px solid white' : '2px solid transparent',
                      outline: index === colorIndex ? '2px solid var(--color-accent)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.4)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button
              onClick={handleExportSTL}
              disabled={isExporting}
              style={{
                width: '100%', padding: '16px', background: 'var(--color-accent)', color: 'white',
                border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
                cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1, transition: 'background 0.2s'
              }}
            >
              {isExporting ? 'Generating STL...' : 'Download STL'}
            </button>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button onClick={handleClose} className="hover-bright" style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
