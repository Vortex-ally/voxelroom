/**
 * A docked sidebar panel with a header and a collapse button.
 * When collapsed it shrinks to a thin rail that can be clicked to expand.
 */
import type { ReactNode } from 'react';
import { PanelLeftIcon, PanelRightIcon } from '../icons/Icons';
import './Panel.css';

interface PanelProps {
  id: string;
  title: string;
  side: 'left' | 'right';
  collapsed: boolean;
  onToggle: () => void;
  /** Extra controls shown in the header, before the collapse button. */
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({
  id,
  title,
  side,
  collapsed,
  onToggle,
  actions,
  children,
}: PanelProps) {
  const ToggleIcon = side === 'left' ? PanelLeftIcon : PanelRightIcon;

  if (collapsed) {
    return (
      <aside className={`panel panel--rail panel--${side}`} aria-label={title}>
        <button
          type="button"
          className="panel__rail-button"
          onClick={onToggle}
          title={`Show ${title}`}
          aria-expanded="false"
          aria-controls={id}
        >
          <ToggleIcon />
          <span className="panel__rail-label">{title}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside id={id} className={`panel panel--${side}`} aria-label={title}>
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        <div className="panel__actions">
          {actions}
          <button
            type="button"
            className="icon-button"
            onClick={onToggle}
            title={`Hide ${title}`}
            aria-expanded="true"
            aria-controls={id}
          >
            <ToggleIcon />
          </button>
        </div>
      </header>
      <div className="panel__body">{children}</div>
    </aside>
  );
}
