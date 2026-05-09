import React, { useEffect, useRef, useState } from 'react';

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
        lockViewport: false
      });
    }

    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, [isReady]);

  // 3. Sync Expressions
  useEffect(() => {
    if (!calculatorRef.current || !expressions) return;

    // First, remove any existing expressions that are currently on the graph
    // to prevent orphaned shapes (e.g. if intervals went from 10 to 5)
    const currentExpressions = calculatorRef.current.getExpressions();
    if (currentExpressions.length > 0) {
      calculatorRef.current.removeExpressions(currentExpressions.map((e: any) => ({ id: e.id })));
    }

    // Then set the new expressions
    calculatorRef.current.setExpressions(expressions);
  }, [expressions, isReady]);

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
