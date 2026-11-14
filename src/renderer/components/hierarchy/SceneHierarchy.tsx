/**
 * Scene hierarchy (outliner): the demo scene as a tree.
 * Click or use ↑/↓ to select, ←/→ to collapse/expand groups, the eye to hide/show.
 */
import {
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
} from 'react';
import {
  KIND_LABELS,
  childrenOf,
  isEffectivelyVisible,
  type EditorAction,
  type EditorState,
  type SceneObject,
} from '../../state/editorState';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  KIND_ICONS,
  SceneIcon,
} from '../icons/Icons';
import './SceneHierarchy.css';

interface SceneHierarchyProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

interface Row {
  object: SceneObject;
  depth: number;
  hasChildren: boolean;
}

export function SceneHierarchy({ state, dispatch }: SceneHierarchyProps) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLowerCase();
  const rows: Row[] = query
    ? state.objects
        .filter((o) => o.name.toLowerCase().includes(query))
        .map((object) => ({ object, depth: 0, hasChildren: false }))
    : flattenTree(state.objects, collapsedIds);

  const toggleCollapsed = (id: string, collapse?: boolean) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const shouldCollapse = collapse ?? !next.has(id);
      if (shouldCollapse) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onTreeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex((r) => r.object.id === state.selectedId);
    const current = rows[index];
    let handled = true;
    if (e.key === 'ArrowDown') {
      const next = rows[Math.min(index + 1, rows.length - 1)];
      if (next) dispatch({ type: 'select', id: next.object.id });
    } else if (e.key === 'ArrowUp') {
      const prev = rows[Math.max(index - 1, 0)];
      if (prev) dispatch({ type: 'select', id: prev.object.id });
    } else if (e.key === 'ArrowLeft' && current?.hasChildren) {
      toggleCollapsed(current.object.id, true);
    } else if (e.key === 'ArrowRight' && current?.hasChildren) {
      toggleCollapsed(current.object.id, false);
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  };

  return (
    <div className="hierarchy">
      <div className="hierarchy__filter">
        <input
          type="search"
          className="hierarchy__filter-input"
          placeholder="Filter objects"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter objects by name"
          spellCheck={false}
        />
      </div>

      <div className="hierarchy__root">
        <SceneIcon size={14} />
        <span>Scene</span>
        <span className="hierarchy__count">{state.objects.length}</span>
      </div>

      <div
        className="hierarchy__tree"
        role="tree"
        aria-label="Scene objects"
        tabIndex={0}
        onKeyDown={onTreeKeyDown}
      >
        {rows.map(({ object, depth, hasChildren }) => {
          const KindIcon = KIND_ICONS[object.data.kind];
          const selected = object.id === state.selectedId;
          const collapsed = collapsedIds.has(object.id);
          const shown = isEffectivelyVisible(state.objects, object);
          return (
            <div
              key={object.id}
              role="treeitem"
              aria-selected={selected}
              aria-expanded={hasChildren ? !collapsed : undefined}
              aria-level={depth + 1}
              className={`tree-row${shown ? '' : ' tree-row--hidden'}`}
              style={{ '--depth': depth } as CSSProperties}
              onClick={() => dispatch({ type: 'select', id: object.id })}
              title={`${object.name} — ${KIND_LABELS[object.data.kind]}`}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="tree-row__twisty"
                  tabIndex={-1}
                  aria-label={collapsed ? 'Expand' : 'Collapse'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(object.id);
                  }}
                >
                  {collapsed ? (
                    <ChevronRightIcon size={12} />
                  ) : (
                    <ChevronDownIcon size={12} />
                  )}
                </button>
              ) : (
                <span className="tree-row__twisty" />
              )}
              <span
                className={`tree-row__icon tree-row__icon--${object.data.kind}`}
              >
                <KindIcon size={14} />
              </span>
              <span className="tree-row__name">{object.name}</span>
              <button
                type="button"
                className="tree-row__visibility"
                tabIndex={-1}
                aria-label={
                  object.visible ? `Hide ${object.name}` : `Show ${object.name}`
                }
                aria-pressed={!object.visible}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({
                    type: 'setVisible',
                    id: object.id,
                    visible: !object.visible,
                  });
                }}
              >
                {object.visible ? (
                  <EyeIcon size={13} />
                ) : (
                  <EyeOffIcon size={13} />
                )}
              </button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="hierarchy__empty">No objects match “{filter}”.</p>
        )}
      </div>
    </div>
  );
}

/** Depth-first list of rows, skipping the children of collapsed groups. */
function flattenTree(
  objects: readonly SceneObject[],
  collapsedIds: ReadonlySet<string>,
  parentId: string | null = null,
  depth = 0,
): Row[] {
  return childrenOf(objects, parentId).flatMap((object) => {
    const hasChildren = childrenOf(objects, object.id).length > 0;
    const row: Row = { object, depth, hasChildren };
    return hasChildren && !collapsedIds.has(object.id)
      ? [row, ...flattenTree(objects, collapsedIds, object.id, depth + 1)]
      : [row];
  });
}
