import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as math from 'mathjs';

export interface Graph3DExpression {
  id: string;
  latex?: string;
  latexInner?: string;
  color?: string;
  meshStyle?: 'SURFACE' | 'WIREFRAME' | 'SOLID' | 'REVOLUTION';
  prismData?: { x: number; y: number; height: number }[];
  dx?: number;
  dy?: number;
  hidden?: boolean;
  fillOpacity?: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  slices?: number;
  method?: string;
  showApproximation?: boolean;
  [key: string]: any;
}


interface Graph3DProps {
  expressions: Graph3DExpression[];
  className?: string;
  style?: React.CSSProperties;
}

const GRID_SIZE = 20;       // Fixed visual size of the plane/grid
const GRID_SEGMENTS = 50;   // Vertex density

function ComputeGraphMesh({ latex, color = '#7c6fff', range, xMin, xMax, yMin, yMax }: Graph3DExpression & { range: number }) {
  const geometryRef = useRef<THREE.BoxGeometry>(null);

  // Memoize the compiled function to avoid recompiling on every render
  const compiledFunc = useMemo(() => {
    if (!latex) return null;
    try {
      return math.compile(latex);
    } catch (e) {
      console.warn("Failed to compile latex:", latex, e);
      return null;
    }
  }, [latex]);

  const boundsInfo = useMemo(() => {
    const halfGrid = GRID_SIZE / 2;
    const scale = halfGrid / range;

    const hasBounds =
      xMin !== undefined &&
      xMax !== undefined &&
      yMin !== undefined &&
      yMax !== undefined &&
      !isNaN(xMin) && !isNaN(xMax) && !isNaN(yMin) && !isNaN(yMax);

    if (hasBounds) {
      const dxMath = xMax - xMin;
      const dyMath = yMax - yMin;

      // Extend the surface by 10% past the rectangles
      const extensionX = dxMath * 0.1;
      const extensionY = dyMath * 0.1;

      const surfXMin = xMin - extensionX;
      const surfXMax = xMax + extensionX;
      const surfYMin = yMin - extensionY;
      const surfYMax = yMax + extensionY;

      const vWidth = (surfXMax - surfXMin) * scale;
      const vLength = (surfYMax - surfYMin) * scale;

      const vCenterX = ((xMin + xMax) / 2) * scale;
      const vCenterY = ((yMin + yMax) / 2) * scale;

      return {
        hasBounds: true,
        surfXMin,
        surfXMax,
        surfYMin,
        surfYMax,
        vWidth,
        vLength,
        vCenterX,
        vCenterY,
        scale
      };
    }

    return {
      hasBounds: false,
      surfXMin: -range,
      surfXMax: range,
      surfYMin: -range,
      surfYMax: range,
      vWidth: GRID_SIZE,
      vLength: GRID_SIZE,
      vCenterX: 0,
      vCenterY: 0,
      scale
    };
  }, [range, xMin, xMax, yMin, yMax]);

  useLayoutEffect(() => {
    if (!geometryRef.current || !compiledFunc) return;

    try {
      const attr = geometryRef.current.attributes.position;
      const positions = attr.array as Float32Array;

      const { surfXMin, surfXMax, surfYMin, surfYMax, vWidth, vLength, scale } = boundsInfo;

      for (let i = 0; i < positions.length; i += 3) {
        const px = positions[i];
        const py = positions[i + 1];

        const tX = (px + vWidth / 2) / vWidth;

        const tY = (vLength / 2 - py) / vLength;
        const x = surfXMin + tX * (surfXMax - surfXMin);
        const y = surfYMin + tY * (surfYMax - surfYMin);

        // Evaluate and scale Z back to visual space
        let z = 0;
        try {
          z = compiledFunc.evaluate({ x, y });
          if (isNaN(z) || !isFinite(z)) z = 0;
        } catch (e) {
          z = 0;
        }

        const visualZ = z * scale;

        positions[i + 2] = visualZ;
      }

      attr.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    } catch (e) {
      console.error("Mesh calculation error:", e);
    }
  }, [compiledFunc, boundsInfo]);

  const { vWidth, vLength, vCenterX, vCenterY } = boundsInfo;

  return (
    <mesh position={[vCenterX, 0, vCenterY]} rotation={[-Math.PI / 2, 0, 0]}>
      <boxGeometry ref={geometryRef} args={[vWidth, vLength, 1, GRID_SEGMENTS, GRID_SEGMENTS, 1]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ApproxPrisms({ prismData = [], dx = 1, dy = 1, color = '#e879f9', range = 10 }: Graph3DExpression & { range: number }) {
  const halfGrid = GRID_SIZE / 2;
  const scale = halfGrid / range; // visual units per math unit

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!instancedMeshRef.current) return;

    const dummy = new THREE.Object3D();
    const count = prismData.length;

    for (let i = 0; i < count; i++) {
      const p = prismData[i];
      const vx = p.x * scale;
      const vy = p.y * scale;
      const vh = p.height * scale;
      const vdx = dx * scale;
      const vdy = dy * scale;

      dummy.position.set(vx, vh / 2, vy);
      dummy.scale.set(vdx, Math.abs(vh), vdy);
      dummy.updateMatrix();
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [prismData, dx, dy, scale]);

  if (prismData.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={instancedMeshRef} args={[null as any, null as any, prismData.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </instancedMesh>
    </group>
  );
}

function RevolutionMesh({ latex, latexInner, color = '#7c6fff', range, xMin, xMax, slices = 12, parsedAxis = { type: 'horizontal', value: 0 }, showApproximation }: Graph3DExpression & { range: number }) {
  const halfGrid = GRID_SIZE / 2;
  const scale = halfGrid / range;

  const compiled = useMemo(() => {
    try { return latex ? math.compile(latex) : null; } catch (e) { return null; }
  }, [latex]);

  const compiledInner = useMemo(() => {
    try { return latexInner ? math.compile(latexInner) : null; } catch (e) { return null; }
  }, [latexInner]);

  const n = Math.max(1, showApproximation ? slices : 64);
  const a = xMin ?? 0;
  const b = xMax ?? 4;
  const dx = (b - a) / n;

  // Generate an array of geometries for the approximation mode
  const approximationGeometries = useMemo(() => {
    if (!showApproximation || !compiled) return [];
    
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
        // Disk/Washer: Horizontal slice
        // Rotate around Y in local space, so radius is X, height is Y.
        // We will rotate the entire mesh by -PI/2 later to align with X axis.
        pts.push(new THREE.Vector2(radiusInner * scale, xStart * scale));
        pts.push(new THREE.Vector2(radius * scale, xStart * scale));
        pts.push(new THREE.Vector2(radius * scale, xEnd * scale));
        pts.push(new THREE.Vector2(radiusInner * scale, xEnd * scale));
        pts.push(new THREE.Vector2(radiusInner * scale, xStart * scale));

        geoms.push({
            geom: new THREE.LatheGeometry(pts, 32),
            pos: [0, parsedAxis.value * scale, 0],
            rot: [0, 0, -Math.PI / 2]
        });
      } else {
        // Shell: Vertical slice
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
            rot: [0, 0, 0]
        });
      }
    }
    return geoms;
  }, [showApproximation, compiled, compiledInner, n, a, dx, scale, parsedAxis]);

  // For smooth (non-approximation) mode, use a single continuous LatheGeometry
  const smoothGeometry = useMemo(() => {
    if (showApproximation || !compiled) return null;
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
         // For shell smooth we only care about outer/inner curve bounds
         outerCurve.push(new THREE.Vector2(vRadius, h2));
         innerCurve.push(new THREE.Vector2(vRadius, h1));
      }
    }
    
    // Connect outer curve and inner curve backwards to form a closed loop
    points.push(...outerCurve);
    points.push(...innerCurve.reverse());
    points.push(outerCurve[0]); // Close the loop

    return new THREE.LatheGeometry(points, 64);
  }, [showApproximation, compiled, compiledInner, a, b, scale, parsedAxis]);

  if (showApproximation) {
      return (
          <group>
             {approximationGeometries.map((data, idx) => (
                 <mesh key={idx} geometry={data.geom} position={data.pos} rotation={data.rot}>
                     <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
                 </mesh>
             ))}
          </group>
      );
  }

  if (!showApproximation && smoothGeometry) {
    return (
      <group>
        <mesh 
          geometry={smoothGeometry} 
          rotation={parsedAxis.type === 'horizontal' ? [0, 0, -Math.PI / 2] : [0, 0, 0]}
          position={parsedAxis.type === 'horizontal' ? [0, parsedAxis.value * scale, 0] : [parsedAxis.value * scale, 0, 0]}
        >
          <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return null;
}

// Intercepts scroll wheel and pinch gestures to change the math range instead of moving the camera
function ZoomHandler({ onZoom }: { onZoom: (delta: number) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onZoom(e.deltaY);
    };

    let initialPinchDistance: number | null = null;

    const getPinchDistance = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }
      return null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault(); // prevent scrolling
        const currentPinchDistance = getPinchDistance(e);
        if (currentPinchDistance) {
          // Invert delta so moving fingers apart zooms in (like scrolling up)
          const delta = initialPinchDistance - currentPinchDistance;
          onZoom(delta * 5); // Adjust sensitivity for touch
          initialPinchDistance = currentPinchDistance;
        }
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistance = null;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl, onZoom]);

  return null;
}

// Smoothly lerps range toward a target each frame using exponential interpolation
function SmoothRange({ targetRange, onRangeUpdate }: { targetRange: number; onRangeUpdate: (r: number) => void }) {
  const currentRange = useRef(targetRange);

  useFrame((_, delta) => {
    const ratio = targetRange / currentRange.current;
    if (Math.abs(ratio - 1) > 0.0005) {
      // Exponential interpolation - smooth for multiplicative zoom
      const t = 1 - Math.pow(0.001, delta); // frame-rate independent smoothing
      currentRange.current *= Math.pow(ratio, t);
      onRangeUpdate(currentRange.current);
    }
  });

  return null;
}

// Compute nice step for a given range
function getNiceStep(range: number) {
  if (range <= 0) return 1;
  const rawStep = (range * 2) / 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  if (residual <= 1.5) return magnitude;
  if (residual <= 3.5) return 2 * magnitude;
  if (residual <= 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

// Crossfading dual-layer grid
function SmoothGrid({ range }: { range: number }) {
  const majorStep = getNiceStep(range);

  // The next finer grid step (half of major)
  const minorStep = majorStep / 2;

  const majorDivs = Math.max(1, Math.round((range * 2) / majorStep));
  const minorDivs = Math.max(1, Math.round((range * 2) / minorStep));

  // Calculate how close we are to needing the minor grid (0 = just snapped, 1 = about to snap)
  const gridSpacingVisual = GRID_SIZE / majorDivs;
  const maxSpacing = GRID_SIZE / 5;
  const minSpacing = GRID_SIZE / 12;
  const minorOpacity = Math.max(0, Math.min(1, (gridSpacingVisual - minSpacing) / (maxSpacing - minSpacing)));

  return (
    <>
      {/* Major grid — always fully visible */}
      <gridHelper args={[GRID_SIZE, majorDivs, 0x444444, 0x333333]} />
      {/* Minor grid — fades in as you zoom toward next breakpoint */}
      {minorOpacity > 0.01 && (
        <gridHelper args={[GRID_SIZE, minorDivs, 0x333333, 0x222222]} />
      )}
    </>
  );
}

export default function Graph3D({ expressions, className = '', style }: Graph3DProps) {
  const [targetRange, setTargetRange] = useState(10);
  const [range, setRange] = useState(10);

  const handleZoom = useCallback((delta: number) => {
    setTargetRange(prev => {
      const factor = 1 + delta * 0.0005; // halved sensitivity for smoother feel
      return Math.max(0.5, Math.min(1000, prev * factor));
    });
  }, []);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        position: 'relative',
        ...style
      }}
    >
      <Canvas camera={{ position: [20, 15, 20], fov: 45 }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <ambientLight />
        <directionalLight />

        <axesHelper args={[GRID_SIZE / 2]} rotation={[-Math.PI / 2, 0, 0]} />
        <SmoothGrid range={range} />

        {/* VISUAL MESHES (With materials and Edges) */}
        <group>
          {expressions.map((expr) => {
            if (expr.meshStyle === 'SOLID') {
              return <ApproxPrisms key={`vis-${expr.id}`} {...expr} range={range} />;
            } else if (expr.meshStyle === 'REVOLUTION') {
              return <RevolutionMesh key={`vis-${expr.id}`} {...expr} range={range} />;
            } else {
              return (
                <ComputeGraphMesh
                  key={`vis-${expr.id}-${expr.latex}`}
                  id={expr.id}
                  latex={expr.latex}
                  color={expr.color}
                  range={range}
                  xMin={expr.xMin}
                  xMax={expr.xMax}
                  yMin={expr.yMin}
                  yMax={expr.yMax}
                />
              );
            }
          })}
        </group>

        <SmoothRange targetRange={targetRange} onRangeUpdate={setRange} />
        <ZoomHandler onZoom={handleZoom} />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
