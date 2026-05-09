import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';

interface MathInputProps {
  value: string;
  onChange?: (latex: string, asciiMath: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function MathInput({ value, onChange, placeholder = 'f(x)', className = '', label }: MathInputProps) {
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

      // Step 1: Normalize shorthand \frac forms to braced form
      // \frac12 -> \frac{1}{2}, \frac1{2x} -> \frac{1}{2x}, \frac{1}2 -> \frac{1}{2}
      mathjsStr = mathjsStr.replace(/\\frac(?!{)(.)(.)/, '\\frac{$1}{$2}');
      mathjsStr = mathjsStr.replace(/\\frac{([^{}]*)}(?!{)(.)/, '\\frac{$1}{$2}');
      mathjsStr = mathjsStr.replace(/\\frac(?!{)(.)({[^{}]*})/, '\\frac{$1}$2');

      // Step 2: Recursively replace innermost fractions \frac{a}{b} -> ((a)/(b))
      let prevStr = '';
      while (mathjsStr.includes('\\frac{') && mathjsStr !== prevStr) {
        prevStr = mathjsStr;
        mathjsStr = mathjsStr.replace(/\\frac{([^{}]*)}{([^{}]*)}/g, '(($1)/($2))');
      }
      
      // Step 3: Clean up LaTeX commands to mathjs-compatible syntax
      mathjsStr = mathjsStr
        .replace(/\\cdot/g, '*')
        .replace(/\\times/g, '*')
        .replace(/\\left\(/g, '(')
        .replace(/\\right\)/g, ')')
        .replace(/\\left\|/g, 'abs(')
        .replace(/\\right\|/g, ')')
        .replace(/\\sqrt{([^{}]+)}/g, 'sqrt($1)')
        .replace(/\\([a-zA-Z]+)/g, '$1')
        .replace(/[{}]/g, '');

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
    mf.style.minWidth = '200px';

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
