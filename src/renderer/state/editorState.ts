/**
 * Editor state: theme, active tool, selection, panel visibility and the demo scene.
 * Managed with React's useReducer (see EditorLayout). Pure TypeScript, no React imports.
 *
 * Conventions: Y is up, units are meters, rotations are Euler XYZ in degrees.
 */

export type Vec3 = [number, number, number];
export type Axis = 0 | 1 | 2;
export type Theme = 'dark' | 'light';
export type ToolId = 'select' | 'move' | 'rotate' | 'scale';
export type PanelId = 'hierarchy' | 'properties';
export type TransformKey = 'position' | 'rotation' | 'scale';

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type ObjectData =
  | { kind: 'group' }
  | { kind: 'camera'; fov: number; near: number; far: number }
  | { kind: 'directionalLight'; intensity: number }
  | { kind: 'pointLight'; intensity: number; range: number }
  | { kind: 'cube'; width: number; height: number; depth: number }
  | { kind: 'cylinder'; radius: number; height: number; segments: number };

export type ObjectKind = ObjectData['kind'];

export interface SceneObject {
  id: string;
  name: string;
  parentId: string | null;
  visible: boolean;
  transform: Transform;
  data: ObjectData;
}

export interface EditorState {
  theme: Theme;
  activeTool: ToolId;
  selectedId: string | null;
  panels: Record<PanelId, boolean>;
  objects: SceneObject[];
}

export const TOOLS: ReadonlyArray<{
  id: ToolId;
  label: string;
  shortcut: string;
  hint: string;
}> = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'Q',
    hint: 'Click an object to select it',
  },
  {
    id: 'move',
    label: 'Move',
    shortcut: 'W',
    hint: 'Drag an axis handle to translate',
  },
  {
    id: 'rotate',
    label: 'Rotate',
    shortcut: 'E',
    hint: 'Drag a ring to rotate around an axis',
  },
  {
    id: 'scale',
    label: 'Scale',
    shortcut: 'R',
    hint: 'Drag a handle to scale along an axis',
  },
];

export const KIND_LABELS: Record<ObjectKind, string> = {
  group: 'Group',
  camera: 'Camera',
  directionalLight: 'Directional Light',
  pointLight: 'Point Light',
  cube: 'Cube',
  cylinder: 'Cylinder',
};

export const UNITS = 'm';

const transform = (
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): Transform => ({ position, rotation, scale });

/** A small mechanical bracket assembly with a camera and two lights. */
export const DEMO_SCENE: SceneObject[] = [
  {
    id: 'camera-main',
    name: 'Main Camera',
    parentId: null,
    visible: true,
    transform: transform([-5, 3.2, 4.5], [-22, -48, 0]),
    data: { kind: 'camera', fov: 45, near: 0.1, far: 500 },
  },
  {
    id: 'light-key',
    name: 'Key Light',
    parentId: null,
    visible: true,
    transform: transform([-3.5, 6, 2.5], [-55, -35, 0]),
    data: { kind: 'directionalLight', intensity: 3.2 },
  },
  {
    id: 'light-fill',
    name: 'Fill Light',
    parentId: null,
    visible: true,
    transform: transform([3.2, 2.8, -2.6]),
    data: { kind: 'pointLight', intensity: 1.4, range: 12 },
  },
  {
    id: 'group-bracket',
    name: 'Bracket Assembly',
    parentId: null,
    visible: true,
    transform: transform([0, 0, 0]),
    data: { kind: 'group' },
  },
  {
    id: 'mesh-base',
    name: 'Base Plate',
    parentId: 'group-bracket',
    visible: true,
    transform: transform([0, 0.15, 0]),
    data: { kind: 'cube', width: 4, height: 0.3, depth: 2.4 },
  },
  {
    id: 'mesh-cube',
    name: 'Cube',
    parentId: 'group-bracket',
    visible: true,
    transform: transform([1.05, 0.9, 0.1], [0, 20, 0]),
    data: { kind: 'cube', width: 1.2, height: 1.2, depth: 1.2 },
  },
  {
    id: 'mesh-cylinder',
    name: 'Cylinder',
    parentId: 'group-bracket',
    visible: true,
    transform: transform([-1.15, 1.4, 0]),
    data: { kind: 'cylinder', radius: 0.45, height: 2.2, segments: 32 },
  },
];

export function createInitialState(theme: Theme): EditorState {
  return {
    theme,
    activeTool: 'move',
    selectedId: 'mesh-cube',
    panels: { hierarchy: true, properties: true },
    objects: DEMO_SCENE,
  };
}

export type EditorAction =
  | { type: 'setTool'; tool: ToolId }
  | { type: 'select'; id: string | null }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'togglePanel'; panel: PanelId }
  | { type: 'setVisible'; id: string; visible: boolean }
  | { type: 'rename'; id: string; name: string }
  | {
      type: 'setTransform';
      id: string;
      key: TransformKey;
      axis: Axis;
      value: number;
    }
  | { type: 'setParam'; id: string; param: string; value: number };

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'setTool':
      return { ...state, activeTool: action.tool };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'togglePanel':
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel]: !state.panels[action.panel],
        },
      };
    case 'setVisible':
      return updateObject(state, action.id, (o) => ({
        ...o,
        visible: action.visible,
      }));
    case 'rename': {
      const name = action.name.trim();
      if (!name) return state;
      return updateObject(state, action.id, (o) => ({ ...o, name }));
    }
    case 'setTransform': {
      if (!Number.isFinite(action.value)) return state;
      return updateObject(state, action.id, (o) => {
        const vec: Vec3 = [...o.transform[action.key]];
        vec[action.axis] = action.value;
        return { ...o, transform: { ...o.transform, [action.key]: vec } };
      });
    }
    case 'setParam': {
      if (!Number.isFinite(action.value)) return state;
      return updateObject(state, action.id, (o) => {
        const current: unknown = (o.data as Record<string, unknown>)[
          action.param
        ];
        if (typeof current !== 'number') return o;
        return {
          ...o,
          data: { ...o.data, [action.param]: action.value } as ObjectData,
        };
      });
    }
  }
}

function updateObject(
  state: EditorState,
  id: string,
  update: (o: SceneObject) => SceneObject,
): EditorState {
  return {
    ...state,
    objects: state.objects.map((o) => (o.id === id ? update(o) : o)),
  };
}

// ---------- Selectors ----------

export function findObject(
  objects: readonly SceneObject[],
  id: string | null,
): SceneObject | undefined {
  return id === null ? undefined : objects.find((o) => o.id === id);
}

export function childrenOf(
  objects: readonly SceneObject[],
  parentId: string | null,
): SceneObject[] {
  return objects.filter((o) => o.parentId === parentId);
}

/** An object is shown only if it and all of its ancestors are visible. */
export function isEffectivelyVisible(
  objects: readonly SceneObject[],
  object: SceneObject,
): boolean {
  let current: SceneObject | undefined = object;
  while (current) {
    if (!current.visible) return false;
    current = findObject(objects, current.parentId);
  }
  return true;
}

// ---------- Theme persistence (per-machine UI preference) ----------

const THEME_KEY = 'voxelroom.theme';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}
