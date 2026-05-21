import { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import tools from '../data/tools';
import type { Tag } from '../data/tools';

const ALL_TAGS: Tag[] = ['Math', 'CS', 'Calculus', 'Algebra', 'Algorithm', 'Statistics'];

export default function Home() {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<Tag | null>(null);

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const matchesSearch =
        query === '' ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase());
      const matchesTag = activeTag === null || t.tags.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [query, activeTag]);

  const liveCount = tools.filter((t) => !t.wip).length;

  return (
    <>
      <Navbar />

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="container">
            <div className="hero__eyebrow fade-in-up" style={{ animationDelay: '0ms' }}>
              <div className="hero__eyebrow-dot" />
              Axiom / Numerical Workspace
            </div>

            <h1 className="hero__title fade-in-up" style={{ animationDelay: '80ms' }}>
              Numerical &amp;{' '}
              <span className="hero__title-gradient">Algorithmic Explorations</span>
            </h1>

            <p className="hero__subtitle fade-in-up" style={{ animationDelay: '160ms' }}>
              An interactive visual environment designed to model, test, and analyze complex numerical methods,
              3D integration geometry, and data structure traversals with high mathematical precision.
            </p>
          </div>
        </section>

        <div className="container">
          {/* ── Terminal Status Bar ── */}
          <div className="terminal-status fade-in-up" style={{ animationDelay: '220ms' }}>
            <div className="terminal-status__group">
              <div className="terminal-status__item">
                <span className="terminal-status__indicator" />
                <span>CORE ENGINE: ONLINE</span>
              </div>
              <div className="terminal-status__item">
                <span className="terminal-status__indicator terminal-status__indicator--active" />
                <span>WORKSPACE MODULES LOADED</span>
              </div>
            </div>
            <div className="terminal-status__group">
              <div className="terminal-status__item">
                <span style={{ color: 'var(--color-text-muted)' }}>ACTIVE DECK:</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{liveCount} WORKSPACE</span>
              </div>
              <div className="terminal-status__item">
                <span style={{ color: 'var(--color-text-muted)' }}>STAGING:</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{tools.length - liveCount} REGISTERED</span>
              </div>
              <div className="terminal-status__item">
                <span style={{ color: 'var(--color-text-muted)' }}>COMPILER:</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>VITE+TSC</span>
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="filter-bar fade-in-up" style={{ animationDelay: '280ms' }}>
            <div className="search-input-wrap">
              <svg
                className="search-input-wrap__icon"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                id="tool-search"
                className="search-input"
                type="text"
                placeholder="Search tools…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search tools"
              />
            </div>

            <div className="filter-chips">
              <button
                id="filter-all"
                className={`filter-chip ${activeTag === null ? 'filter-chip--active' : ''}`}
                onClick={() => setActiveTag(null)}
              >
                All
              </button>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  id={`filter-${tag.toLowerCase()}`}
                  className={`filter-chip ${activeTag === tag ? 'filter-chip--active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ── Grid ── */}
          <p className="section-label">
            {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
          </p>

          <div className="tools-grid">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🔭</div>
                <p className="empty-state__text">No tools match your search.</p>
              </div>
            ) : (
              filtered.map((tool, i) => <ToolCard key={tool.id} tool={tool} index={i} />)
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer />
    </>
  );
}
