import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar showBack />
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '72px', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>404</div>
          <h1 style={{ fontSize: '24px', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Tool not found
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            This tool doesn't exist yet — or maybe it's coming soon.
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'opacity 150ms',
            }}
          >
            ← Back to hub
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
