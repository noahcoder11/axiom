import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';
import { ComputeEngine } from '@cortex-js/compute-engine';

interface MathInputProps {
  value: string;
  onChange?: (latex: string, asciiMath: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function MathInput({ value, onChange, placeholder: _placeholder = 'f(x)', className = '', label }: MathInputProps) {
  const mfRef = useRef<MathfieldElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    if (mf.value !== value && !isFocused) {
      mf.value = value;
    }

    const handleInput = (e: Event) => {
      const target = e.target as MathfieldElement;
      const latex = target.getValue('latex');

      let mathjsStr = latex;

      try {
        const ce = new ComputeEngine();
        const expr = ce.parse(latex);
        mathjsStr = expr.toString();

        // Convert ComputeEngine string syntax to mathjs-compatible syntax where they differ
        mathjsStr = mathjsStr
          .replace(/\bln\(/g, 'log(')
          .replace(/\blog\(([^,]+)\)/g, 'log10($1)')
          .replace(/\|([^|]+)\|/g, 'abs($1)');
      } catch (err) {
        console.warn('ComputeEngine failed to parse LaTeX:', err);
      }
      onChange?.(latex, mathjsStr);
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focusin', handleFocus);
    mf.addEventListener('focusout', handleBlur);

    mf.style.border = 'none';
    mf.style.outline = 'none';
    mf.style.boxShadow = 'none';
    mf.style.background = 'transparent';
    mf.style.color = 'var(--color-text)';
    mf.style.fontSize = '1.1rem';
    mf.style.padding = '0';
    mf.style.minWidth = '0'; // Allow it to shrink in flex containers

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focusin', handleFocus);
      mf.removeEventListener('focusout', handleBlur);
    };
  }, [onChange, value]);

  return (
    <div className={`math-input-wrapper ${className}`}>
      {label && <label className="math-input-label">{label}</label>}
      <div className={`math-input-container ${isFocused ? 'focused' : ''}`}>
        {React.createElement('math-field', {
          ref: mfRef,
          style: { width: '100%' }
        })}
      </div>

      <style>{`
        .math-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .math-input-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-subtle);
        }
        .math-input-container {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          display: flex;
          align-items: center;
          cursor: text;
        }
        .math-input-container:hover {
          border-color: var(--color-border-hover);
        }
        .math-input-container.focused {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-glow);
        }
        /* Hide MathLive's virtual keyboard toggle if desired, or customize it */
        math-field::part(virtual-keyboard-toggle) {
          color: var(--color-text-subtle);
          transition: color var(--transition-fast);
        }
        math-field::part(virtual-keyboard-toggle):hover {
          color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
