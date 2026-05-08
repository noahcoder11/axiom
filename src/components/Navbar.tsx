import { Link } from 'react-router-dom';

interface NavbarProps {
  showBack?: boolean;
}

export default function Navbar({ showBack = false }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          <div className="navbar__logo-icon">⚡</div>
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
    </nav>
  );
}
