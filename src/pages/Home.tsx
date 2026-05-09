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
  const categories = new Set(tools.flatMap((t) => t.tags)).size;

  return (
    <>
      <Navbar />

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="container">
            <div className="hero__eyebrow fade-in-up" style={{ animationDelay: '0ms' }}>
              <div className="hero__eyebrow-dot" />
              Interactive math &amp; CS tools
            </div>

            <h1 className="hero__title fade-in-up" style={{ animationDelay: '80ms' }}>
              Build intuition,{' '}
              <span className="hero__title-gradient">one tool at a time</span>
            </h1>

            <p className="hero__subtitle fade-in-up" style={{ animationDelay: '160ms' }}>
              Visualizers, calculators, and algorithm demos for exploring math and
              computer science concepts interactively.
            </p>
          </div>
        </section>

        <div className="container">
          {/* ── Stats ── */}
          <div className="stats fade-in-up" style={{ animationDelay: '220ms' }}>
            <div className="stats__item">
              <div className="stats__value">{tools.length}</div>
              <div className="stats__label">Tools</div>
            </div>
            <div className="stats__item">
              <div className="stats__value">{liveCount}</div>
              <div className="stats__label">Live</div>
            </div>
            <div className="stats__item">
              <div className="stats__value">{categories}</div>
              <div className="stats__label">Categories</div>
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
