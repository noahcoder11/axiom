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
          <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 className="hero__title fade-in-up" style={{ animationDelay: '0ms', fontSize: '3rem', marginBottom: '16px' }}>
              Interactive <span className="hero__title-gradient">Mathematics</span>
            </h1>

            <p className="hero__subtitle fade-in-up" style={{ animationDelay: '80ms', maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
              Explore calculus, algebra, and algorithms through beautiful, interactive 3D visualizations and tools designed to help you build intuition.
            </p>
          </div>
        </section>

        <div className="container">
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
