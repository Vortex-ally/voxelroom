/**
 * Contextual toolbar: panel toggles, transform tools and a hint for the active tool.
 */
import type { Dispatch } from 'react';
import {
  TOOLS,
  type EditorAction,
  type EditorState,
} from '../../state/editorState';
import { PanelLeftIcon, PanelRightIcon, TOOL_ICONS } from '../icons/Icons';
import './ToolBar.css';

interface ToolBarProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

export function ToolBar({ state, dispatch }: ToolBarProps) {
  const activeTool = TOOLS.find((t) => t.id === state.activeTool);

  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      <button
        type="button"
        className="icon-button"
        aria-pressed={state.panels.hierarchy}
        onClick={() => dispatch({ type: 'togglePanel', panel: 'hierarchy' })}
        title="Toggle Scene Hierarchy"
      >
        <PanelLeftIcon />
      </button>

      <div className="toolbar__divider" />

      <div className="tool-group" role="radiogroup" aria-label="Transform tool">
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          const active = state.activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              role="radio"
              aria-checked={active}
              className="tool-button"
              onClick={() => dispatch({ type: 'setTool', tool: tool.id })}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon />
              <span className="tool-button__label">{tool.label}</span>
              <kbd className="tool-button__key">{tool.shortcut}</kbd>
            </button>
          );
        })}
      </div>

      <div className="toolbar__divider" />

      {activeTool && (
        <p className="toolbar__hint">
          <span className="toolbar__hint-tool">{activeTool.label}</span>
          {activeTool.hint}
        </p>
      )}

      <div className="toolbar__spacer" />

      <button
        type="button"
        className="icon-button"
        aria-pressed={state.panels.properties}
        onClick={() => dispatch({ type: 'togglePanel', panel: 'properties' })}
        title="Toggle Properties"
      >
        <PanelRightIcon />
      </button>
    </div>
  );
}
