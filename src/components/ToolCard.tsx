import { Link } from 'react-router-dom';
import type { Tool, Tag } from '../data/tools';

interface ToolCardProps {
  tool: Tool;
  index: number;
}

const tagClass: Record<Tag, string> = {
  Math: 'tag--math',
  CS: 'tag--cs',
  Calculus: 'tag--calculus',
  Algebra: 'tag--algebra',
  Algorithm: 'tag--algo',
  Statistics: 'tag--stats',
};

export default function ToolCard({ tool, index }: ToolCardProps) {
  const delay = `${index * 60}ms`;

  const content = (
    <>
      <div className="tool-card__header">
        <div className="tool-card__icon">{tool.icon}</div>
        <svg
          className="tool-card__arrow"
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>

      <div>
        <div className="tool-card__name">
          {tool.name}
          {tool.wip && (
            <span
              className="tag tag--stats"
              style={{ marginLeft: 8, fontSize: 10, verticalAlign: 'middle' }}
            >
              soon
            </span>
          )}
        </div>
        <div className="tool-card__desc">{tool.description}</div>
      </div>

      <div className="tool-card__tags">
        {tool.tags.map((t) => (
          <span key={t} className={`tag ${tagClass[t]}`}>
            {t}
          </span>
        ))}
      </div>
    </>
  );

  if (tool.wip) {
    return (
      <div
        className="tool-card fade-in-up"
        style={{ animationDelay: delay, opacity: 0.55, cursor: 'default' }}
      >
        {content}
      </div>
    );
  }

  return (
    <Link to={tool.path} className="tool-card fade-in-up" style={{ animationDelay: delay }}>
      {content}
    </Link>
  );
}
