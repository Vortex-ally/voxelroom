/**
 * Editor shell: owns the editor state (useReducer) and arranges the
 * top bar, toolbar, sidebars, viewport and status bar.
 */
import { useEffect, useReducer, useState } from 'react';
import {
  TOOLS,
  createInitialState,
  editorReducer,
  findObject,
  loadTheme,
  saveTheme,
} from '../../state/editorState';
import { SceneHierarchy } from '../hierarchy/SceneHierarchy';
import { PropertiesPanel } from '../inspector/PropertiesPanel';
import { ViewportPlaceholder } from '../viewport/ViewportPlaceholder';
import { Panel } from './Panel';
import { StatusBar, type GroundPoint } from './StatusBar';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import './EditorLayout.css';

/** Input types that do not accept typed text, so shortcuts stay active on them. */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * True when the key event targets a control the user is typing into: text-like
 * inputs, textareas, selects and editable content. Non-Element targets (window,
 * document) are never text entry.
 */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  const control = target.closest('input, textarea, select');
  if (control instanceof HTMLInputElement)
    return !NON_TEXT_INPUT_TYPES.has(control.type);
  return control !== null;
}

export function EditorLayout() {
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    createInitialState(loadTheme()),
  );
  const [cursor, setCursor] = useState<GroundPoint | null>(null);

  // Apply and remember the theme.
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    saveTheme(state.theme);
  }, [state.theme]);

  // Single-key shortcuts (ignored while typing in a field). Letter shortcuts
  // match the physical key (`e.code`), so they work on any keyboard layout.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing)
        return;
      if (isTextEntryTarget(e.target)) return;

      const tool = TOOLS.find((t) => e.code === `Key${t.shortcut}`);
      if (tool) {
        dispatch({ type: 'setTool', tool: tool.id });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'select', id: null });
      } else if (e.code === 'KeyH') {
        const selected = findObject(state.objects, state.selectedId);
        if (selected)
          dispatch({
            type: 'setVisible',
            id: selected.id,
            visible: !selected.visible,
          });
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.objects, state.selectedId]);

  const leftOpen = state.panels.hierarchy;
  const rightOpen = state.panels.properties;

  return (
    <div className="editor">
      <TopBar state={state} dispatch={dispatch} />
      <ToolBar state={state} dispatch={dispatch} />

      <div
        className="editor__workspace"
        data-left={leftOpen ? 'open' : 'collapsed'}
        data-right={rightOpen ? 'open' : 'collapsed'}
      >
        <Panel
          id="panel-hierarchy"
          title="Scene Hierarchy"
          side="left"
          collapsed={!leftOpen}
          onToggle={() => dispatch({ type: 'togglePanel', panel: 'hierarchy' })}
        >
          <SceneHierarchy state={state} dispatch={dispatch} />
        </Panel>

        <ViewportPlaceholder
          state={state}
          dispatch={dispatch}
          onCursorChange={setCursor}
        />

        <Panel
          id="panel-properties"
          title="Properties"
          side="right"
          collapsed={!rightOpen}
          onToggle={() =>
            dispatch({ type: 'togglePanel', panel: 'properties' })
          }
        >
          <PropertiesPanel state={state} dispatch={dispatch} />
        </Panel>
      </div>

      <StatusBar state={state} cursor={cursor} />
    </div>
  );
}
