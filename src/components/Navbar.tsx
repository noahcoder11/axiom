import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  showBack?: boolean;
}

export default function Navbar({ showBack = false }: NavbarProps) {
  return (
    <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="container navbar__inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="navbar__logo">
            <img src="/axiom/logo.png" alt="Axiom Logo" className="navbar__logo-icon" style={{ background: 'none', border: 'none' }} />
            Axiom
          </Link>

          {showBack && (
            <Link to="/" className="navbar__back">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All tools
            </Link>
          )}
        </div>
        
        <ThemeToggle />
      </div>
    </nav>
  );
}
