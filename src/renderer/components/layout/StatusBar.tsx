/**
 * Bottom status bar: active tool, selection, cursor coordinates, scene stats and units.
 */
import {
  KIND_LABELS,
  TOOLS,
  UNITS,
  findObject,
  type EditorState,
} from '../../state/editorState';
import { CursorIcon, TOOL_ICONS } from '../icons/Icons';
import './StatusBar.css';

export interface GroundPoint {
  x: number;
  z: number;
}

interface StatusBarProps {
  state: EditorState;
  cursor: GroundPoint | null;
}

/** Three decimals, without showing "-0.000". */
const fmt = (n: number) => (Math.abs(n) < 0.0005 ? 0 : n).toFixed(3);

export function StatusBar({ state, cursor }: StatusBarProps) {
  const tool = TOOLS.find((t) => t.id === state.activeTool);
  const ToolIcon = TOOL_ICONS[state.activeTool];
  const selected = findObject(state.objects, state.selectedId);
  const meshCount = state.objects.filter(
    (o) => o.data.kind === 'cube' || o.data.kind === 'cylinder',
  ).length;

  return (
    <footer className="statusbar">
      <span
        className="statusbar__item statusbar__item--accent"
        title="Active tool"
      >
        <ToolIcon size={13} />
        {tool?.label}
      </span>

      <span className="statusbar__sep" />

      <span className="statusbar__item" title="Selection">
        {selected ? (
          <>
            <span className="statusbar__label">Selected</span>
            <span className="statusbar__value">{selected.name}</span>
            <span className="statusbar__muted">
              {KIND_LABELS[selected.data.kind]}
            </span>
          </>
        ) : (
          <span className="statusbar__muted">Nothing selected</span>
        )}
      </span>

      <span className="statusbar__spacer" />

      <span
        className="statusbar__item mono"
        title="Cursor position on the ground plane (Y = 0)"
      >
        <CursorIcon size={13} />
        {cursor ? (
          <>
            <span className="statusbar__axis statusbar__axis--x">X</span>
            {fmt(cursor.x)}
            <span className="statusbar__axis statusbar__axis--y">Y</span>
            {fmt(0)}
            <span className="statusbar__axis statusbar__axis--z">Z</span>
            {fmt(cursor.z)}
          </>
        ) : (
          <span className="statusbar__muted">—</span>
        )}
      </span>

      <span className="statusbar__sep" />

      <span className="statusbar__item statusbar__item--collapsible">
        <span className="statusbar__label">Objects</span>
        <span className="statusbar__value">{state.objects.length}</span>
        <span className="statusbar__label">Meshes</span>
        <span className="statusbar__value">{meshCount}</span>
      </span>

      <span className="statusbar__sep statusbar__item--collapsible" />

      <span className="statusbar__item statusbar__item--collapsible">
        <span className="statusbar__label">Grid</span>
        <span className="statusbar__value">1 {UNITS}</span>
      </span>

      <span className="statusbar__sep" />

      <span className="statusbar__item" title="Scene units">
        <span className="statusbar__label">Units</span>
        <span className="statusbar__units">Meters ({UNITS})</span>
      </span>
    </footer>
  );
}
