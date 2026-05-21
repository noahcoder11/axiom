import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as math from 'mathjs';
import { STLExporter } from 'three-stdlib';


// Filament Color Presets
const FILAMENT_COLORS = [
  { name: 'Silk Silver', value: '#d1d5db', roughness: 0.15, metalness: 0.8 },
  { name: 'Matte Black', value: '#1f2937', roughness: 0.85, metalness: 0.1 },
  { name: 'Bambu Orange', value: '#ea580c', roughness: 0.35, metalness: 0.15 },
  { name: 'Ruby Red', value: '#dc2626', roughness: 0.25, metalness: 0.25 },
  { name: 'Electric Blue', value: '#2563eb', roughness: 0.2, metalness: 0.4 },
  { name: 'Emerald Green', value: '#059669', roughness: 0.3, metalness: 0.2 }
];

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asciiFunc: string;
  lowerBoundX: string;
  upperBoundX: string;
  lowerBoundY: string;
  upperBoundY: string;
  intervalsX: string;
  intervalsY: string;
  method?: string;
}

// -------------------------------------------------------------
// SURFACE PRINT MESH (Smooth mathematical functions)
// -------------------------------------------------------------
interface SurfacePrintMeshProps {
  latex: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  length: number;
  height: number;
  thickness: number;
  style: 'solid' | 'shell';
  color: string;
  roughness: number;
  metalness: number;
  globalZMin: number;
  globalZMax: number;
  segments?: number;
  transparent?: boolean;
  opacity?: number;
  extension?: number;
}

function SurfacePrintMesh({
  latex,
  xMin,
  xMax,
  yMin,
  yMax,
  width,
  length,
  height,
  thickness,
  style,
  color,
  roughness,
  metalness,
  globalZMin,
  globalZMax,
  segments = 60,
  transparent = false,
  opacity = 1.0,
  extension = 0
}: SurfacePrintMeshProps) {
  const geometryRef = useRef<THREE.BoxGeometry>(null);
  const vertexSides = useRef<Int8Array | null>(null);

  const compiledFunc = useMemo(() => {
    if (!latex) return null;
    try {
      return math.compile(latex);
    } catch (e) {
      console.warn("Failed to compile latex:", latex, e);
      return null;
    }
  }, [latex]);

  useEffect(() => {
    if (!geometryRef.current || !compiledFunc) return;

    try {
      const attr = geometryRef.current.attributes.position;
      const positions = attr.array as Float32Array;

      if (!vertexSides.current || vertexSides.current.length !== positions.length / 3) {
        vertexSides.current = new Int8Array(positions.length / 3);
        for (let i = 0; i < positions.length; i += 3) {
          vertexSides.current[i / 3] = positions[i + 2] > 0 ? 1 : -1;
        }
      }

      const mathMin = Math.min(0, globalZMin);
      const mathMax = Math.max(0, globalZMax);
      const mathSpan = mathMax - mathMin;
      const scaleZ = mathSpan > 1e-5 ? (height - thickness) / mathSpan : 1;
      const zPlanePhysical = thickness + (0 - mathMin) * scaleZ;

      const fullWidth = width + 2 * extension;
      const fullLength = length + 2 * extension;

      const dxMath = xMax - xMin;
      const dyMath = yMax - yMin;

      const mathMarginX = (extension / width) * dxMath;
      const mathMarginY = (extension / length) * dyMath;

      const surfXMin = xMin - mathMarginX;
      const surfXMax = xMax + mathMarginX;
      const surfYMin = yMin - mathMarginY;
      const surfYMax = yMax + mathMarginY;

      for (let i = 0; i < positions.length; i += 3) {
        const px = positions[i];
        const py = positions[i + 1];
        const side = vertexSides.current[i / 3];

        const tX = (px + fullWidth / 2) / fullWidth;
        const tY = (py + fullLength / 2) / fullLength;
        const x = surfXMin + tX * (surfXMax - surfXMin);
        const y = surfYMin + tY * (surfYMax - surfYMin);

        let z = 0;
        try {
          z = compiledFunc.evaluate({ x, y });
          if (isNaN(z) || !isFinite(z)) z = 0;
        } catch (e) {
          z = 0;
        }

        const zScaled = z * scaleZ;

        if (side > 0) {
          positions[i + 2] = zPlanePhysical + zScaled;
        } else {
          if (style === 'solid') {
            positions[i + 2] = 0;
          } else {
            positions[i + 2] = zPlanePhysical + zScaled - thickness;
          }
        }
      }

      attr.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    } catch (e) {
      console.error("Preview mesh computation error:", e);
    }
  }, [compiledFunc, xMin, xMax, yMin, yMax, width, length, height, thickness, style, globalZMin, globalZMax, extension]);

  return (
    <mesh>
      <boxGeometry ref={geometryRef} args={[width + 2 * extension, length + 2 * extension, 1, segments, segments, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

// -------------------------------------------------------------
// PRISMS PRINT MESH (Riemann sum approximation)
// -------------------------------------------------------------
interface PrismsPrintMeshProps {
  prismData: { x: number; y: number; height: number }[];
  dx: number;
  dy: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  length: number;
  height: number;
  thickness: number;
  color: string;
  roughness: number;
  metalness: number;
  globalZMin: number;
  globalZMax: number;
}

function PrismsPrintMesh({
  prismData,
  dx,
  dy,
  xMin,
  xMax,
  yMin,
  yMax,
  width,
  length,
  height,
  thickness,
  color,
  roughness,
  metalness,
  globalZMin,
  globalZMax
}: PrismsPrintMeshProps) {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const scaleX = width / xRange;
  const scaleY = length / yRange;

  const mathMin = Math.min(0, globalZMin);
  const mathMax = Math.max(0, globalZMax);
  const mathSpan = mathMax - mathMin;
  const scaleZ = mathSpan > 1e-5 ? (height - thickness) / mathSpan : 1;
  const zPlanePhysical = thickness + (0 - mathMin) * scaleZ;

  return (
    <group>
      {/* Base Plate (Only rendered when completely positive) */}
      {globalZMin >= 0 && (
        <mesh position={[0, 0, thickness / 2]}>
          <boxGeometry args={[width, length, thickness]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      )}

      {/* Prisms */}
      {prismData.map((p, i) => {
        const px = (p.x - xMin) * scaleX - width / 2;
        const py = (p.y - yMin) * scaleY - length / 2;
        const pdx = dx * scaleX;
        const pdy = dy * scaleY;

        const prismBoxHeight = Math.abs(p.height) * scaleZ;

        if (prismBoxHeight <= 0.05) return null;

        return (
          <mesh
            key={i}
            position={[px, py, zPlanePhysical + (p.height / 2) * scaleZ]}
          >
            <boxGeometry args={[pdx, pdy, prismBoxHeight]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// MAIN DIALOG / CONFIGURATOR COMPONENT
// -------------------------------------------------------------
export default function PrintSettingsModal({
  isOpen,
  onClose,
  asciiFunc,
  lowerBoundX,
  upperBoundX,
  lowerBoundY,
  upperBoundY,
  intervalsX,
  intervalsY,
  method = 'midpoint'
}: PrintSettingsModalProps) {
  // Parse math bounds safely
  const parsedBounds = useMemo(() => {
    const ax = Number(lowerBoundX);
    const bx = Number(upperBoundX);
    const cy = Number(lowerBoundY);
    const dy = Number(upperBoundY);

    return {
      xMin: isNaN(ax) ? -5 : ax,
      xMax: isNaN(bx) ? 5 : bx,
      yMin: isNaN(cy) ? -5 : cy,
      yMax: isNaN(dy) ? 5 : dy
    };
  }, [lowerBoundX, upperBoundX, lowerBoundY, upperBoundY]);

  // Reconstruct surface and prism expressions internally to ensure they are ALWAYS available,
  // regardless of the main UI visibility checkboxes!
  const surfaceExpr = useMemo(() => {
    if (!asciiFunc) return null;
    return {
      id: 'f',
      latex: asciiFunc,
      color: '#7c6fff',
      meshStyle: 'SURFACE' as const
    };
  }, [asciiFunc]);

  const prismExpr = useMemo(() => {
    if (!asciiFunc) return null;
    const ax = Number(lowerBoundX);
    const bx = Number(upperBoundX);
    const ay = Number(lowerBoundY);
    const by = Number(upperBoundY);
    const nx = Number(intervalsX);
    const ny = Number(intervalsY);

    if (isNaN(ax) || isNaN(bx) || isNaN(ay) || isNaN(by) || isNaN(nx) || isNaN(ny)) {
      return null;
    }

    try {
      const f = math.compile(asciiFunc);
      const dx = (bx - ax) / nx;
      const dy = (by - ay) / ny;
      const prisms: { x: number; y: number; height: number }[] = [];
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const x = ax + (i + 0.5) * dx; // midpoint of cell
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
      return {
        id: 'prisms',
        dx,
        dy,
        prismData: prisms,
        color: '#e879f9',
        meshStyle: 'SOLID' as const
      };
    } catch (e) {
      return null;
    }
  }, [asciiFunc, lowerBoundX, upperBoundX, lowerBoundY, upperBoundY, intervalsX, intervalsY, method]);

  // Calculate global mathematical Z bounds
  const { globalZMin, globalZMax } = useMemo(() => {
    let min = 0;
    let max = 0;
    let hasData = false;

    // 1. Sample surface if active
    if (surfaceExpr?.latex) {
      try {
        const compiled = math.compile(surfaceExpr.latex);
        const gridRes = 40;
        const { xMin, xMax, yMin, yMax } = parsedBounds;
        for (let i = 0; i <= gridRes; i++) {
          const x = xMin + (i / gridRes) * (xMax - xMin);
          for (let j = 0; j <= gridRes; j++) {
            const y = yMin + (j / gridRes) * (yMax - yMin);
            try {
              const z = compiled.evaluate({ x, y });
              if (!isNaN(z) && isFinite(z)) {
                if (!hasData) {
                  min = z;
                  max = z;
                  hasData = true;
                } else {
                  min = Math.min(min, z);
                  max = Math.max(max, z);
                }
              }
            } catch (e) { }
          }
        }
      } catch (e) { }
    }

    // 2. Sample prisms if active
    if (prismExpr?.prismData) {
      for (const p of prismExpr.prismData) {
        if (!hasData) {
          min = p.height;
          max = p.height;
          hasData = true;
        } else {
          min = Math.min(min, p.height);
          max = Math.max(max, p.height);
        }
      }
    }

    return { globalZMin: min, globalZMax: max };
  }, [surfaceExpr, prismExpr, parsedBounds]);

  // Component configuration states
  const [printTarget, setPrintTarget] = useState<'surface' | 'prisms' | 'both'>(
    prismExpr && surfaceExpr ? 'both' : (prismExpr ? 'prisms' : 'surface')
  );

  const includeSurface = printTarget === 'surface' || printTarget === 'both';
  const includePrisms = printTarget === 'prisms' || printTarget === 'both';

  // Settings
  const [width, setWidth] = useState(100);       // mm
  const [length, setLength] = useState(100);     // mm
  const [height, setHeight] = useState(40);       // mm
  const [thickness, setThickness] = useState(3);  // mm
  const [surfaceExtension, setSurfaceExtension] = useState(5); // mm - smooth surface extension past rectangles
  const [baseStyle, setBaseStyle] = useState<'solid' | 'shell'>('shell');
  const [colorIndex, setColorIndex] = useState(2); // Default to Bambu Orange for cool 3D print vibe
  const [isExporting, setIsExporting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const selectedFilament = FILAMENT_COLORS[colorIndex];
  const exportGroupRef = useRef<THREE.Group>(null);

  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    document.documentElement.classList.remove('modal-open');
    setTimeout(() => {
      onClose();
    }, 350);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  // Calculate Average Math Heights & Volume Estimate
  const volumeEstimate = useMemo(() => {
    let surfaceVol = 0;
    let prismsVol = 0;
    const baseVol = (width * length * thickness) / 1000;

    const mathMin = Math.min(0, globalZMin);
    const mathMax = Math.max(0, globalZMax);
    const mathSpan = mathMax - mathMin;
    const scaleZ = mathSpan > 1e-5 ? (height - thickness) / mathSpan : 1;
    const zPlanePhysical = thickness + (0 - mathMin) * scaleZ;

    const collarVol = globalZMin < 0 ? (
      ((width + 6) * (length + 6) * thickness) / 1000
    ) : 0;

    if (includeSurface && surfaceExpr?.latex) {
      try {
        const compiled = math.compile(surfaceExpr.latex);
        const { xMin, xMax, yMin, yMax } = parsedBounds;
        let zSum = 0;
        let count = 0;

        const res = 20;
        for (let i = 0; i <= res; i++) {
          const x = xMin + (i / res) * (xMax - xMin);
          for (let j = 0; j <= res; j++) {
            const y = yMin + (j / res) * (yMax - yMin);
            let z = 0;
            try {
              z = compiled.evaluate({ x, y });
              if (isNaN(z) || !isFinite(z)) z = 0;
            } catch (e) {
              z = 0;
            }
            zSum += z;
            count++;
          }
        }

        if (count > 0) {
          const zAvg = zSum / count;
          if (globalZMin < 0) {
            if (baseStyle === 'shell') {
              surfaceVol = collarVol;
            } else {
              const avgHeightPhys = zPlanePhysical + zAvg * scaleZ;
              surfaceVol = (width * length * avgHeightPhys) / 1000 + (collarVol - baseVol);
            }
          } else {
            if (baseStyle === 'shell') {
              surfaceVol = baseVol;
            } else {
              const avgHeightPhys = zPlanePhysical + zAvg * scaleZ;
              surfaceVol = (width * length * avgHeightPhys) / 1000;
            }
          }
        }
      } catch (e) { }
    }

    if (includePrisms && prismExpr) {
      const prismData = prismExpr.prismData || [];
      const scaleX = width / (parsedBounds.xMax - parsedBounds.xMin);
      const scaleY = length / (parsedBounds.yMax - parsedBounds.yMin);

      const prismVolumeSum = prismData.reduce((sum, p) => {
        const prismBoxHeight = Math.abs(p.height) * scaleZ;
        const pdx = (prismExpr.dx || 1) * scaleX;
        const pdy = (prismExpr.dy || 1) * scaleY;
        return sum + (pdx * pdy * prismBoxHeight);
      }, 0);

      if (globalZMin < 0) {
        prismsVol = (prismVolumeSum / 1000) + collarVol;
      } else {
        prismsVol = baseVol + (prismVolumeSum / 1000);
      }
    }

    // Combined volume estimation
    if (includeSurface && includePrisms) {
      if (baseStyle === 'solid') {
        return Math.max(surfaceVol, prismsVol);
      } else {
        if (globalZMin < 0) {
          return Math.max(0, prismsVol + surfaceVol - collarVol);
        } else {
          return Math.max(0, prismsVol + surfaceVol - baseVol);
        }
      }
    } else if (includeSurface) {
      return surfaceVol;
    } else if (includePrisms) {
      return prismsVol;
    }
    return 0;
  }, [includeSurface, includePrisms, surfaceExpr, prismExpr, width, length, height, thickness, baseStyle, parsedBounds, globalZMin, globalZMax, printTarget, surfaceExtension]);

  // STLExporter download handler
  const handleExportSTL = () => {
    if (!exportGroupRef.current) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const group = exportGroupRef.current!;

        // 1. Temporarily clear group rotation to align math Z as the STL Z-axis (upward)
        const oldRotation = group.rotation.clone();
        group.rotation.set(0, 0, 0);
        group.updateMatrixWorld(true);

        // 2. Parse using STLExporter
        const exporter = new STLExporter();
        const stlData = exporter.parse(group, { binary: true }) as DataView;

        // 3. Restore visual rotation for canvas representation
        group.rotation.copy(oldRotation);
        group.updateMatrixWorld(true);

        // 4. Create and trigger download blob
        const blob = new Blob([stlData.buffer as any], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const targetName = printTarget === 'both' ? 'COMBINED' : (printTarget === 'surface' ? 'SURFACE' : 'RIEMANN_SUM');
        const actualWidth = printTarget === 'both' ? width + 2 * surfaceExtension : width;
        const actualLength = printTarget === 'both' ? length + 2 * surfaceExtension : length;
        link.download = `AXIOM_${targetName}_${actualWidth.toFixed(0)}x${actualLength.toFixed(0)}x${height.toFixed(0)}mm.stl`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to generate STL:", e);
        alert("An error occurred while generating the STL file.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const zPlanePhysical = useMemo(() => {
    const minVal = Math.min(0, globalZMin);
    const maxVal = Math.max(0, globalZMax);
    const mathSpan = maxVal - minVal;
    const scaleZ = mathSpan > 1e-5 ? (height - thickness) / mathSpan : 1;
    return thickness + (0 - minVal) * scaleZ;
  }, [globalZMin, globalZMax, height, thickness]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-overlay ${isAnimatingOut ? 'is-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        #root {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      filter 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          transform-origin: center center;
        }
        .modal-open #root {
          transform: scale(0.965) !important;
          filter: brightness(0.55) blur(10px) !important;
          pointer-events: none !important;
        }
        @keyframes modalOverlayFadeIn {
          from {
            background-color: rgba(5, 5, 8, 0);
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
          to {
            background-color: rgba(5, 5, 8, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
        }
        @keyframes modalOverlayFadeOut {
          from {
            background-color: rgba(5, 5, 8, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          to {
            background-color: rgba(5, 5, 8, 0);
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
        }
        @keyframes modalCardAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(40px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modalCardDisappear {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(30px);
          }
        }
        .modal-overlay {
          animation: modalOverlayFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-overlay.is-closing {
          animation: modalOverlayFadeOut 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-card {
          animation: modalCardAppear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .modal-card.is-closing {
          animation: modalCardDisappear 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* Modal Card */}
      <div className={`modal-card ${isAnimatingOut ? 'is-closing' : ''}`} style={{
        width: '100%',
        maxWidth: '1100px',
        height: '90vh',
        maxHeight: '760px',
        background: 'rgba(23, 23, 31, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {/* --- LEFT: LIVE 3D PREVIEW CANVAS --- */}
        <div style={{
          flex: '1.2',
          background: 'radial-gradient(circle at center, #161622 0%, #0d0d14 100%)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Canvas Wrapper */}
          <div style={{ flex: 1, width: '100%', height: '100%' }}>
            <Canvas camera={{ position: [110, 110, 110], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[100, 150, 50]} intensity={1.2} castShadow />
              <directionalLight position={[-100, -50, -50]} intensity={0.4} />
              <pointLight position={[0, 100, 0]} intensity={0.5} />

              {/* Grid Helper to represent print bed */}
              <gridHelper args={[300, 30, '#333344', '#1f1f2e']} position={[0, -0.1, 0]} />

              {/* Export/Preview Group: Rotated by -90deg on X to align Three.js Y-up visually */}
              <group ref={exportGroupRef} rotation={[-Math.PI / 2, 0, 0]}>
                {includeSurface && surfaceExpr?.latex && (
                  <SurfacePrintMesh
                    latex={surfaceExpr.latex}
                    xMin={parsedBounds.xMin}
                    xMax={parsedBounds.xMax}
                    yMin={parsedBounds.yMin}
                    yMax={parsedBounds.yMax}
                    width={width}
                    length={length}
                    height={height}
                    thickness={thickness}
                    style={baseStyle}
                    color={selectedFilament.value}
                    roughness={selectedFilament.roughness}
                    metalness={selectedFilament.metalness}
                    globalZMin={globalZMin}
                    globalZMax={globalZMax}
                    transparent={printTarget === 'both'}
                    opacity={printTarget === 'both' ? 0.65 : 1.0}
                    extension={printTarget === 'both' ? surfaceExtension : 0}
                  />
                )}

                {includePrisms && prismExpr && (
                  <PrismsPrintMesh
                    prismData={prismExpr.prismData || []}
                    dx={prismExpr.dx || 1}
                    dy={prismExpr.dy || 1}
                    xMin={parsedBounds.xMin}
                    xMax={parsedBounds.xMax}
                    yMin={parsedBounds.yMin}
                    yMax={parsedBounds.yMax}
                    width={width}
                    length={length}
                    height={height}
                    thickness={thickness}
                    color={selectedFilament.value}
                    roughness={selectedFilament.roughness}
                    metalness={selectedFilament.metalness}
                    globalZMin={globalZMin}
                    globalZMax={globalZMax}
                  />
                )}

                {globalZMin < 0 && (
                  <mesh position={[0, 0, zPlanePhysical]}>
                    <boxGeometry args={[
                      width + 6,
                      length + 6,
                      thickness
                    ]} />
                    <meshStandardMaterial
                      color={selectedFilament.value}
                      roughness={selectedFilament.roughness}
                      metalness={selectedFilament.metalness}
                      transparent={printTarget === 'both'}
                      opacity={printTarget === 'both' ? 0.35 : 0.9}
                    />
                  </mesh>
                )}
              </group>

              <OrbitControls enableZoom={true} minDistance={40} maxDistance={400} />
            </Canvas>
          </div>

          {/* Floating Instructions */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(10, 10, 15, 0.6)',
            backdropFilter: 'blur(8px)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none'
          }}>
            🖱️ Drag to rotate • Scroll to zoom
          </div>

          {/* Filament Selector Palette */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(10, 10, 15, 0.65)',
            backdropFilter: 'blur(8px)',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filament Preview</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {FILAMENT_COLORS.map((filament, index) => (
                <button
                  key={index}
                  onClick={() => setColorIndex(index)}
                  title={filament.name}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: filament.value,
                    border: colorIndex === index ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: colorIndex === index ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT: CONFIGURATION & SETTINGS PANEL --- */}
        <div style={{
          flex: '0.8',
          background: 'var(--color-surface)',
          padding: 'var(--space-lg)',
          boxSizing: 'border-box',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}>3D Print Configurator</h2>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Configure dimensions in millimeters (mm)</div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--color-text-muted)',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              className="hover-bright"
            >
              ×
            </button>
          </div>

          {/* Toggle Print Targets (if both surface & prisms exist) */}
          {surfaceExpr && prismExpr && (
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.2)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 'var(--space-md)',
              gap: '4px'
            }}>
              <button
                onClick={() => setPrintTarget('prisms')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: printTarget === 'prisms' ? 'rgba(124, 111, 255, 0.15)' : 'transparent',
                  border: printTarget === 'prisms' ? '1px solid rgba(124, 111, 255, 0.3)' : '1px solid transparent',
                  color: printTarget === 'prisms' ? 'white' : 'var(--color-text-muted)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Riemann Prisms
              </button>
              <button
                onClick={() => setPrintTarget('surface')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: printTarget === 'surface' ? 'rgba(124, 111, 255, 0.15)' : 'transparent',
                  border: printTarget === 'surface' ? '1px solid rgba(124, 111, 255, 0.3)' : '1px solid transparent',
                  color: printTarget === 'surface' ? 'white' : 'var(--color-text-muted)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Smooth Surface
              </button>
              <button
                onClick={() => setPrintTarget('both')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: printTarget === 'both' ? 'rgba(124, 111, 255, 0.15)' : 'transparent',
                  border: printTarget === 'both' ? '1px solid rgba(124, 111, 255, 0.3)' : '1px solid transparent',
                  color: printTarget === 'both' ? 'white' : 'var(--color-text-muted)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Combined (Both)
              </button>
            </div>
          )}

          {/* Settings Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1 }}>

            {/* Base Style Selector (Only for surface target) */}
            {includeSurface && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Base style</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setBaseStyle('solid')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: baseStyle === 'solid' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
                      border: baseStyle === 'solid' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255,255,255,0.04)',
                      color: baseStyle === 'solid' ? 'white' : 'var(--color-text-muted)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    ⏹️ <strong>Flat Bottom (Solid)</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>Fills solid down to print bed. Stable print.</div>
                  </button>
                  <button
                    onClick={() => setBaseStyle('shell')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: baseStyle === 'shell' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
                      border: baseStyle === 'shell' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255,255,255,0.04)',
                      color: baseStyle === 'shell' ? 'white' : 'var(--color-text-muted)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    〰️ <strong>Uniform Shell</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>Curved thin sheet structure. Saves filament.</div>
                  </button>
                </div>
              </div>
            )}

            {/* Slider: WIDTH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Physical Width (X-axis)</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-2)' }}>{width} mm</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min="20"
                  max="250"
                  value={width}
                  onChange={(e) => setWidth(Math.max(20, Math.min(250, Number(e.target.value))))}
                  style={{
                    width: '64px',
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>

            {/* Slider: LENGTH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Physical Length (Y-axis)</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-2)' }}>{length} mm</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min="20"
                  max="250"
                  value={length}
                  onChange={(e) => setLength(Math.max(20, Math.min(250, Number(e.target.value))))}
                  style={{
                    width: '64px',
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>

            {/* Slider: MAX HEIGHT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Max Object Height (Z-axis)</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-2)' }}>{height} mm</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min="10"
                  max="150"
                  value={height}
                  onChange={(e) => setHeight(Math.max(10, Math.min(150, Number(e.target.value))))}
                  style={{
                    width: '64px',
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>

            {/* Slider: BASE THICKNESS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {includeSurface && baseStyle === 'shell' ? 'Shell Thickness' : 'Base Plate Thickness'}
                </label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-2)' }}>{thickness} mm</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={thickness}
                  onChange={(e) => setThickness(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="0.5"
                  value={thickness}
                  onChange={(e) => setThickness(Math.max(1, Math.min(15, Number(e.target.value))))}
                  style={{
                    width: '64px',
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                {includeSurface && baseStyle === 'shell'
                  ? 'Recommended shell thickness for prints is 1.5–3.0 mm.'
                  : 'A 2.5–4.0 mm base plate binds the model together securely.'
                }
              </div>
            </div>

            {/* Slider: SURFACE EXTENSION (Only for combined mode) */}
            {printTarget === 'both' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Surface Extension (Past rectangles)</label>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-2)' }}>{surfaceExtension} mm</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={surfaceExtension}
                    onChange={(e) => setSurfaceExtension(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={surfaceExtension}
                    onChange={(e) => setSurfaceExtension(Math.max(0, Math.min(15, Number(e.target.value))))}
                    style={{
                      width: '64px',
                      padding: '4px 6px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                  Extends the smooth mathematical surface past the Riemann prisms bounding box.
                </div>
              </div>
            )}

            {/* Print Domain Stats Summary */}
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '8px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Print Specification</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Bounding Box:</span>
                <span style={{ color: 'white', fontWeight: 500 }}>
                  {printTarget === 'both'
                    ? `${(width + 2 * surfaceExtension).toFixed(1)} × ${(length + 2 * surfaceExtension).toFixed(1)}`
                    : `${width.toFixed(1)} × ${length.toFixed(1)}`
                  } × {height.toFixed(1)} mm
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Domain Region:</span>
                <span style={{ color: 'white', fontWeight: 500 }}>[{parsedBounds.xMin}, {parsedBounds.xMax}] × [{parsedBounds.yMin}, {parsedBounds.yMax}]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Volume (Approx):</span>
                <span style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>{volumeEstimate.toFixed(1)} cm³</span>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-bright"
            >
              Cancel
            </button>
            <button
              onClick={handleExportSTL}
              disabled={isExporting}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #4f46e5 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 15px rgba(124, 111, 255, 0.4)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              className="hover-bright"
            >
              {isExporting ? (
                <>⏳ Generating STL...</>
              ) : (
                <>💾 Download STL file</>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
