import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';

declare global {
  interface Window {
    Desmos: any;
  }
}

export interface DesmosExpression {
  id: string;
  latex?: string;
  color?: string;
  lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED';
  hidden?: boolean;
  fillOpacity?: number;
  [key: string]: any;
}

interface DesmosGraphProps {
  expressions: DesmosExpression[];
  className?: string;
  style?: React.CSSProperties;
  apiKey?: string;
}

export default function DesmosGraph({
  expressions,
  className = '',
  style,
  apiKey = import.meta.env.VITE_DESMOS_API_KEY || 'dcb31709b452b1cf9dc26972add0fda6'
}: DesmosGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useTheme();

  // 1. Load the Desmos script
  useEffect(() => {
    if (window.Desmos) {
      setIsReady(true);
      return;
    }

    const scriptId = 'desmos-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${apiKey}`;
      script.async = true;
      document.body.appendChild(script);
    }

    const handleLoad = () => setIsReady(true);
    script.addEventListener('load', handleLoad);

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, [apiKey]);

  // 2. Initialize Calculator
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    if (!calculatorRef.current) {
      calculatorRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
        keypad: false,         // Hide keypad
        expressions: false,    // Hide left sidebar
        settingsMenu: false,   // Hide settings wrench
        zoomButtons: true,     // Keep zoom controls
        expressionsTopbar: false,
        lockViewport: false,
        invertedColors: resolvedTheme === 'dark'
      });
    }

    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, [isReady]); // intentionally don't include resolvedTheme here to avoid recreating

  // 2.5 Update Settings on Theme Change
  useEffect(() => {
    if (isReady && calculatorRef.current) {
      calculatorRef.current.updateSettings({
        invertedColors: resolvedTheme === 'dark'
      });
    }
  }, [resolvedTheme, isReady]);

  // 3. Sync Expressions
  useEffect(() => {
    if (!calculatorRef.current || !expressions) return;

    // Pre-invert hex colors to counteract Desmos's internal invertedColors calculation (only in dark mode)
    const processedExpressions = expressions.map(expr => {
      if (expr.color) {
        return {
          ...expr,
          color: resolvedTheme === 'dark' ? invertHexColor(expr.color) : expr.color
        };
      }
      return expr;
    });

    // Sync with Desmos. Note: Desmos automatically handles updates if IDs match.
    // However, if the user reduces the number of intervals, we need to remove the orphaned expressions.
    // We can do this by first getting all current expression IDs.
    const currentExprs = calculatorRef.current.getExpressions();
    const newIds = new Set(processedExpressions.map(e => e.id));
    const idsToRemove = currentExprs
      .filter((e: any) => !newIds.has(e.id))
      .map((e: any) => e.id);

    if (idsToRemove.length > 0) {
      calculatorRef.current.removeExpressions(idsToRemove.map((id: string) => ({ id })));
    }

    calculatorRef.current.setExpressions(processedExpressions);
  }, [expressions, isReady, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className={`desmos-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        ...style
      }}
    >
      {!isReady && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: 'var(--color-text-muted)' }}>
          Loading Graphing Calculator...
        </div>
      )}
    </div>
  );
}

function invertHexColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return hex;
  let cleanHex = hex.replace('#', '');
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  if (cleanHex.length !== 6) {
    return hex;
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const invertedR = (255 - r).toString(16).padStart(2, '0');
  const invertedG = (255 - g).toString(16).padStart(2, '0');
  const invertedB = (255 - b).toString(16).padStart(2, '0');
  
  return `#${invertedR}${invertedG}${invertedB}`;
}
