/**
 * Top application bar: branding, in-window menus, project name and theme switcher.
 */
import { useEffect, useRef, useState, type Dispatch } from 'react';
import {
  TOOLS,
  findObject,
  type EditorAction,
  type EditorState,
} from '../../state/editorState';
import { CheckIcon, LogoMark, MoonIcon, SunIcon } from '../icons/Icons';
import './TopBar.css';

interface MenuItem {
  label: string;
  shortcut?: string;
  checked?: boolean;
  /** Items without an action are shown disabled (planned for later milestones). */
  action?: () => void;
}
type MenuEntry = MenuItem | 'separator';

interface TopBarProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const MOD = navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl+';

export function TopBar({ state, dispatch }: TopBarProps) {
  const selected = findObject(state.objects, state.selectedId);

  const menus: Array<{ id: string; label: string; items: MenuEntry[] }> = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New Project', shortcut: `${MOD}N` },
        { label: 'Open…', shortcut: `${MOD}O` },
        'separator',
        { label: 'Save', shortcut: `${MOD}S` },
        { label: 'Save As…', shortcut: `${MOD}Shift+S` },
        'separator',
        { label: 'Import…' },
        { label: 'Export…' },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: `${MOD}Z` },
        { label: 'Redo', shortcut: `${MOD}Shift+Z` },
        'separator',
        {
          label: 'Select None',
          shortcut: 'Esc',
          action: selected
            ? () => dispatch({ type: 'select', id: null })
            : undefined,
        },
        'separator',
        ...TOOLS.map(
          (tool): MenuItem => ({
            label: `${tool.label} Tool`,
            shortcut: tool.shortcut,
            checked: state.activeTool === tool.id,
            action: () => dispatch({ type: 'setTool', tool: tool.id }),
          }),
        ),
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          label: 'Scene Hierarchy',
          checked: state.panels.hierarchy,
          action: () => dispatch({ type: 'togglePanel', panel: 'hierarchy' }),
        },
        {
          label: 'Properties',
          checked: state.panels.properties,
          action: () => dispatch({ type: 'togglePanel', panel: 'properties' }),
        },
        'separator',
        {
          label: 'Dark Theme',
          checked: state.theme === 'dark',
          action: () => dispatch({ type: 'setTheme', theme: 'dark' }),
        },
        {
          label: 'Light Theme',
          checked: state.theme === 'light',
          action: () => dispatch({ type: 'setTheme', theme: 'light' }),
        },
        'separator',
        { label: 'Frame Selected', shortcut: 'F' },
      ],
    },
    {
      id: 'object',
      label: 'Object',
      items: [
        { label: 'Add Cube' },
        { label: 'Add Cylinder' },
        'separator',
        {
          label:
            selected?.visible === false ? 'Show Selected' : 'Hide Selected',
          shortcut: 'H',
          action: selected
            ? () =>
                dispatch({
                  type: 'setVisible',
                  id: selected.id,
                  visible: !selected.visible,
                })
            : undefined,
        },
        { label: 'Duplicate', shortcut: `${MOD}D` },
        { label: 'Delete', shortcut: 'Del' },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [{ label: 'Keyboard Shortcuts' }, { label: 'About VoxelRoom' }],
    },
  ];

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <LogoMark />
        <span className="topbar__name">VoxelRoom</span>
      </div>

      <MenuBar menus={menus} />

      <div className="topbar__title" title="Untitled Project — Demo Scene">
        <span className="topbar__project">Untitled Project</span>
        <span className="topbar__divider">/</span>
        <span className="topbar__scene">Demo Scene</span>
      </div>

      <div className="topbar__end">
        <div className="theme-switch" role="radiogroup" aria-label="Theme">
          <button
            type="button"
            role="radio"
            aria-checked={state.theme === 'dark'}
            className="theme-switch__option"
            onClick={() => dispatch({ type: 'setTheme', theme: 'dark' })}
            title="Dark theme"
          >
            <MoonIcon size={14} />
            <span className="theme-switch__label">Dark</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={state.theme === 'light'}
            className="theme-switch__option"
            onClick={() => dispatch({ type: 'setTheme', theme: 'light' })}
            title="Light theme"
          >
            <SunIcon size={14} />
            <span className="theme-switch__label">Light</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuBar({
  menus,
}: {
  menus: Array<{ id: string; label: string; items: MenuEntry[] }>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const openedByKeyboard = useRef(false);

  // When a menu is opened from the keyboard, move focus to its first item.
  useEffect(() => {
    if (!openId || !openedByKeyboard.current) return;
    openedByKeyboard.current = false;
    focusItem(barRef.current?.querySelector<HTMLElement>('.menu') ?? null, 1);
  }, [openId]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpenId(null);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [openId]);

  const switchMenu = (delta: number) => {
    const index = menus.findIndex((m) => m.id === openId);
    const next = menus[(index + delta + menus.length) % menus.length];
    if (!next) return;
    openedByKeyboard.current = true;
    setOpenId(next.id);
  };

  return (
    <nav className="menubar" ref={barRef} aria-label="Main menu">
      {menus.map((menu) => {
        const open = openId === menu.id;
        return (
          <div className="menubar__item" key={menu.id}>
            <button
              type="button"
              className="menubar__button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={(e) => {
                // detail === 0 means the click came from Enter/Space, not the mouse.
                openedByKeyboard.current = e.detail === 0;
                setOpenId(open ? null : menu.id);
              }}
              onPointerEnter={() => {
                if (openId && !open) setOpenId(menu.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  openedByKeyboard.current = true;
                  setOpenId(menu.id);
                }
              }}
            >
              {menu.label}
            </button>
            {open && (
              <div
                className="menu"
                role="menu"
                aria-label={menu.label}
                onKeyDown={(e) => {
                  const menuEl = e.currentTarget;
                  if (e.key === 'ArrowDown') focusItem(menuEl, 1);
                  else if (e.key === 'ArrowUp') focusItem(menuEl, -1);
                  else if (e.key === 'ArrowRight') switchMenu(1);
                  else if (e.key === 'ArrowLeft') switchMenu(-1);
                  else return;
                  e.preventDefault();
                }}
              >
                {menu.items.map((entry, i) =>
                  entry === 'separator' ? (
                    <div
                      key={`sep-${i}`}
                      className="menu__separator"
                      role="separator"
                    />
                  ) : (
                    <button
                      key={entry.label}
                      type="button"
                      role={
                        entry.checked === undefined
                          ? 'menuitem'
                          : 'menuitemcheckbox'
                      }
                      aria-checked={entry.checked}
                      className="menu__item"
                      disabled={!entry.action}
                      onClick={() => {
                        entry.action?.();
                        setOpenId(null);
                      }}
                    >
                      <span className="menu__check">
                        {entry.checked && <CheckIcon size={12} />}
                      </span>
                      <span className="menu__label">{entry.label}</span>
                      {entry.shortcut && (
                        <kbd className="menu__shortcut">{entry.shortcut}</kbd>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Moves focus to the next (delta 1) or previous (delta -1) enabled item in a menu. */
function focusItem(menu: HTMLElement | null, delta: number) {
  if (!menu) return;
  const items = Array.from(
    menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:enabled'),
  );
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = (index + delta + items.length) % items.length;
  items[index === -1 && delta < 0 ? items.length - 1 : next]?.focus();
}
