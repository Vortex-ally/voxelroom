/**
 * Viewport PLACEHOLDER. Draws the demo scene as a fixed isometric SVG:
 * grid, axes, shaded meshes with hidden edges, camera/light glyphs and a
 * tool gizmo for the selection. Not a 3D engine: there is no orbit/pan/zoom yet.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  KIND_LABELS,
  TOOLS,
  UNITS,
  findObject,
  isEffectivelyVisible,
  type EditorAction,
  type EditorState,
  type SceneObject,
  type ToolId,
  type Vec3,
} from '../../state/editorState';
import type { GroundPoint } from '../layout/StatusBar';
import {
  apply,
  applyLinear,
  centroid,
  cross,
  dot,
  meshShape,
  normalize,
  rotationMatrix,
  sub,
  worldBounds,
  worldMatrix,
} from './sceneGeometry';
import './ViewportPlaceholder.css';

interface ViewportProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  onCursorChange: (point: GroundPoint | null) => void;
}

// ---------- Fixed isometric view ----------

const AZIMUTH = 45 * (Math.PI / 180);
const ELEVATION = 30 * (Math.PI / 180);
const [SIN_A, COS_A] = [Math.sin(AZIMUTH), Math.cos(AZIMUTH)];
const [SIN_E, COS_E] = [Math.sin(ELEVATION), Math.cos(ELEVATION)];
/** Unit vector pointing from the scene toward the viewer. */
const TO_VIEWER: Vec3 = [COS_E * SIN_A, SIN_E, COS_E * COS_A];
/** Fixed light direction used for flat shading (from upper left). */
const LIGHT_DIR = normalize([-0.45, 0.85, 0.4]);

interface Point2 {
  x: number;
  y: number;
}

/** World → screen pixels (SVG y points down). */
function project([x, y, z]: Vec3, scale: number): Point2 {
  const horizontal = x * COS_A - z * SIN_A;
  const up = y * COS_E - (x * SIN_A + z * COS_A) * SIN_E;
  return { x: horizontal * scale, y: -up * scale };
}

/** Distance toward the viewer; larger values are drawn later (on top). */
const depthOf = (p: Vec3) => dot(p, TO_VIEWER);

/** Screen pixels → point on the ground plane (y = 0). */
function unprojectToGround(sx: number, sy: number, scale: number): GroundPoint {
  const diff = sx / scale; // x·cosA − z·sinA
  const sum = sy / (scale * SIN_E); // x·sinA + z·cosA
  return {
    x: diff * COS_A + sum * SIN_A,
    z: sum * COS_A - diff * SIN_A,
  };
}

const pointsAttr = (pts: Point2[]) =>
  pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

// ---------- Mesh drawing data ----------

interface MeshDrawing {
  id: string;
  depth: number;
  faces: Array<{ points: Point2[]; shade: number }>;
  visibleEdges: Array<[Point2, Point2]>;
  hiddenEdges: Array<[Point2, Point2]>;
}

function buildMeshDrawing(
  objects: readonly SceneObject[],
  object: SceneObject,
  scale: number,
): MeshDrawing | undefined {
  const shape = meshShape(object);
  if (!shape) return undefined;
  const world = worldMatrix(objects, object);
  const verts = shape.vertices.map((v) => apply(world, v));
  const screen = verts.map((v) => project(v, scale));
  const center = centroid(verts);

  // Outward normals (robust for convex shapes regardless of winding).
  const faceInfo = shape.faces.map((face) => {
    const [a, b, c] = [verts[face[0]!]!, verts[face[1]!]!, verts[face[2]!]!];
    let n = normalize(cross(sub(b, a), sub(c, a)));
    const fc = centroid(face.map((i) => verts[i]!));
    if (dot(n, sub(fc, center)) < 0) n = [-n[0], -n[1], -n[2]];
    return { face, normal: n, front: dot(n, TO_VIEWER) > 1e-6 };
  });

  // Edges with their adjacent faces.
  const edges = new Map<string, { a: number; b: number; faces: number[] }>();
  faceInfo.forEach(({ face }, fi) => {
    face.forEach((a, k) => {
      const b = face[(k + 1) % face.length]!;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const edge = edges.get(key) ?? { a, b, faces: [] };
      edge.faces.push(fi);
      edges.set(key, edge);
    });
  });

  const visibleEdges: Array<[Point2, Point2]> = [];
  const hiddenEdges: Array<[Point2, Point2]> = [];
  for (const { a, b, faces } of edges.values()) {
    const adjacent = faces.map((f) => faceInfo[f]!);
    const anyFront = adjacent.some((f) => f.front);
    const silhouette =
      adjacent.some((f) => f.front) && adjacent.some((f) => !f.front);
    const crease =
      adjacent.length < 2 ||
      dot(adjacent[0]!.normal, adjacent[1]!.normal) <
        Math.cos(25 * (Math.PI / 180));
    if (!crease && !silhouette) continue;
    (anyFront ? visibleEdges : hiddenEdges).push([screen[a]!, screen[b]!]);
  }

  const faces = faceInfo
    .filter((f) => f.front)
    .map((f) => ({
      points: f.face.map((i) => screen[i]!),
      shade: 0.35 + 0.65 * Math.max(0, dot(f.normal, LIGHT_DIR)),
    }));

  return {
    id: object.id,
    depth: depthOf(center),
    faces,
    visibleEdges,
    hiddenEdges,
  };
}

// ---------- Component ----------

export function ViewportPlaceholder({
  state,
  dispatch,
  onCursorChange,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(hostRef);

  // Fit the demo scene into the available space.
  const scale = Math.max(18, Math.min(size.width / 12.5, size.height / 10));
  const offsetY = -1.4 * scale; // lift the view so the model sits slightly above center
  const viewBox = `${-size.width / 2} ${-size.height / 2 + offsetY} ${size.width} ${size.height}`;

  const objects = state.objects;
  const visibleObjects = objects.filter((o) =>
    isEffectivelyVisible(objects, o),
  );
  const meshes = visibleObjects
    .map((o) => buildMeshDrawing(objects, o, scale))
    .filter((m): m is MeshDrawing => m !== undefined)
    .sort((a, b) => a.depth - b.depth);
  const helpers = visibleObjects.filter(
    (o) =>
      o.data.kind === 'camera' ||
      o.data.kind === 'directionalLight' ||
      o.data.kind === 'pointLight',
  );

  const selected = findObject(objects, state.selectedId);
  const selectedShown = selected
    ? isEffectivelyVisible(objects, selected)
    : false;

  const select = (id: string) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dispatch({ type: 'select', id });
  };

  const toGround = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left - rect.width / 2;
    const sy = e.clientY - rect.top - rect.height / 2 + offsetY;
    return unprojectToGround(sx, sy, scale);
  };

  return (
    <section className="viewport" aria-label="Viewport">
      <div className="viewport__canvas" ref={hostRef}>
        {size.width > 0 && (
          <svg
            className="viewport__svg"
            width={size.width}
            height={size.height}
            viewBox={viewBox}
            onPointerDown={(e) => {
              if (e.button === 0) dispatch({ type: 'select', id: null });
            }}
            onPointerMove={(e) => onCursorChange(toGround(e))}
            onPointerLeave={() => onCursorChange(null)}
            role="img"
            aria-label="Isometric preview of the demo scene"
          >
            <Grid scale={scale} />

            {meshes.map((mesh) => {
              const isSelected = mesh.id === state.selectedId;
              return (
                <g
                  key={mesh.id}
                  className={`vp-mesh${isSelected ? ' vp-mesh--selected' : ''}`}
                  onPointerDown={select(mesh.id)}
                >
                  {mesh.hiddenEdges.map(([a, b], i) => (
                    <line
                      key={`h${i}`}
                      className="vp-mesh__hidden"
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                    />
                  ))}
                  {mesh.faces.map((face, i) => (
                    <polygon
                      key={`f${i}`}
                      className="vp-mesh__face"
                      points={pointsAttr(face.points)}
                      style={{
                        fill: `color-mix(in srgb, var(--vp-face) ${Math.round(face.shade * 100)}%, var(--mesh-shadow))`,
                      }}
                    />
                  ))}
                  {mesh.visibleEdges.map(([a, b], i) => (
                    <line
                      key={`e${i}`}
                      className="vp-mesh__edge"
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                    />
                  ))}
                </g>
              );
            })}

            {helpers.map((o) => (
              <HelperGlyph
                key={o.id}
                objects={objects}
                object={o}
                scale={scale}
                selected={o.id === state.selectedId}
                onPointerDown={select(o.id)}
              />
            ))}

            {selected && selectedShown && (
              <SelectionOverlay
                objects={objects}
                object={selected}
                tool={state.activeTool}
                scale={scale}
              />
            )}
          </svg>
        )}
      </div>

      <div className="viewport__overlay viewport__overlay--top-left">
        <span className="vp-chip vp-chip--strong">Isometric</span>
        <span className="vp-chip">Shaded + Edges</span>
        <span
          className="vp-chip vp-chip--accent"
          title="The real 3D engine is added in a later step"
        >
          Preview
        </span>
      </div>

      <SelectionCard state={state} />

      <div className="viewport__overlay viewport__overlay--bottom-left">
        <AxisGizmo />
      </div>

      <div className="viewport__overlay viewport__overlay--bottom-right">
        <NavigationHints tool={state.activeTool} />
      </div>
    </section>
  );
}

// ---------- Grid and axes ----------

const GRID_EXTENT = 24;

function Grid({ scale }: { scale: number }) {
  const lines: Array<{ a: Point2; b: Point2; major: boolean; key: string }> =
    [];
  for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i++) {
    if (i === 0) continue;
    const major = i % 5 === 0;
    lines.push({
      key: `x${i}`,
      major,
      a: project([i, 0, -GRID_EXTENT], scale),
      b: project([i, 0, GRID_EXTENT], scale),
    });
    lines.push({
      key: `z${i}`,
      major,
      a: project([-GRID_EXTENT, 0, i], scale),
      b: project([GRID_EXTENT, 0, i], scale),
    });
  }
  const xAxis = [
    project([-GRID_EXTENT, 0, 0], scale),
    project([GRID_EXTENT, 0, 0], scale),
  ] as const;
  const zAxis = [
    project([0, 0, -GRID_EXTENT], scale),
    project([0, 0, GRID_EXTENT], scale),
  ] as const;
  const origin = project([0, 0, 0], scale);
  const yTop = project([0, 1.5, 0], scale);

  return (
    <g className="vp-grid" aria-hidden="true">
      {lines.map((l) => (
        <line
          key={l.key}
          className={l.major ? 'vp-grid__major' : 'vp-grid__minor'}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
        />
      ))}
      <line
        className="vp-axis vp-axis--x"
        x1={xAxis[0].x}
        y1={xAxis[0].y}
        x2={xAxis[1].x}
        y2={xAxis[1].y}
      />
      <line
        className="vp-axis vp-axis--z"
        x1={zAxis[0].x}
        y1={zAxis[0].y}
        x2={zAxis[1].x}
        y2={zAxis[1].y}
      />
      <line
        className="vp-axis vp-axis--y"
        x1={origin.x}
        y1={origin.y}
        x2={yTop.x}
        y2={yTop.y}
      />
      <circle className="vp-origin" cx={origin.x} cy={origin.y} r={2.5} />
    </g>
  );
}

// ---------- Camera and light glyphs ----------

function HelperGlyph({
  objects,
  object,
  scale,
  selected,
  onPointerDown,
}: {
  objects: readonly SceneObject[];
  object: SceneObject;
  scale: number;
  selected: boolean;
  onPointerDown: (e: PointerEvent) => void;
}) {
  const world = worldMatrix(objects, object);
  const pos = world.t;
  const p = project(pos, scale);
  const ground = project([pos[0], 0, pos[2]], scale);
  const forward = normalize(
    applyLinear(rotationMatrix(object.transform.rotation), [0, 0, -1]),
  );
  const className = `vp-helper vp-helper--${object.data.kind}${selected ? ' vp-helper--selected' : ''}`;
  const d = object.data;

  let body: ReactNode = null;
  if (d.kind === 'camera') {
    // Frustum pyramid in the camera's local space.
    const len = 0.9;
    const h = Math.tan((d.fov / 2) * (Math.PI / 180)) * len;
    const w = h * 1.5;
    const corners = (
      [
        [-w, -h, -len],
        [w, -h, -len],
        [w, h, -len],
        [-w, h, -len],
      ] as Vec3[]
    ).map((c) => project(apply(world, c), scale));
    const upTip = project(apply(world, [0, h * 1.6, -len]), scale);
    body = (
      <>
        <polygon className="vp-helper__fill" points={pointsAttr(corners)} />
        {corners.map((c, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} />
        ))}
        <polygon points={pointsAttr(corners)} />
        <polygon
          className="vp-helper__solid"
          points={pointsAttr(
            [corners[3]!, corners[2]!, upTip].map((c, i) =>
              i < 2
                ? {
                    x: c.x + (upTip.x - c.x) * 0.45,
                    y: c.y + (upTip.y - c.y) * 0.45,
                  }
                : c,
            ),
          )}
        />
      </>
    );
  } else if (d.kind === 'directionalLight') {
    const tip = project(
      [
        pos[0] + forward[0] * 2.2,
        pos[1] + forward[1] * 2.2,
        pos[2] + forward[2] * 2.2,
      ],
      scale,
    );
    body = (
      <>
        <line
          className="vp-helper__ray"
          x1={p.x}
          y1={p.y}
          x2={tip.x}
          y2={tip.y}
        />
        <circle cx={tip.x} cy={tip.y} r={2.5} className="vp-helper__solid" />
        <circle cx={p.x} cy={p.y} r={7} className="vp-helper__fill" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={p.x + Math.cos(a) * 10}
              y1={p.y + Math.sin(a) * 10}
              x2={p.x + Math.cos(a) * 14}
              y2={p.y + Math.sin(a) * 14}
            />
          );
        })}
      </>
    );
  } else if (d.kind === 'pointLight') {
    body = (
      <>
        <circle cx={p.x} cy={p.y} r={6} className="vp-helper__fill" />
        <circle cx={p.x} cy={p.y} r={11} className="vp-helper__ray" />
        <circle cx={p.x} cy={p.y} r={2} className="vp-helper__solid" />
      </>
    );
  }

  return (
    <g className={className} onPointerDown={onPointerDown}>
      <line
        className="vp-helper__drop"
        x1={p.x}
        y1={p.y}
        x2={ground.x}
        y2={ground.y}
      />
      <ellipse
        className="vp-helper__ground"
        cx={ground.x}
        cy={ground.y}
        rx={5}
        ry={5 * SIN_E}
      />
      {body}
      {/* Generous invisible hit area so small glyphs are easy to click. */}
      <circle className="vp-helper__hit" cx={p.x} cy={p.y} r={16} />
      <text className="vp-helper__label" x={p.x + 18} y={p.y - 10}>
        {object.name}
      </text>
    </g>
  );
}

// ---------- Selection: bounds brackets + tool gizmo ----------

function SelectionOverlay({
  objects,
  object,
  tool,
  scale,
}: {
  objects: readonly SceneObject[];
  object: SceneObject;
  tool: ToolId;
  scale: number;
}) {
  const world = worldMatrix(objects, object);
  const origin = project(world.t, scale);
  const bounds = worldBounds(objects, object);

  let brackets: ReactNode = null;
  if (bounds) {
    const { min, max } = bounds;
    const corners: Vec3[] = [];
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) corners.push([x, y, z]);
    const pts = corners.map((c) => project(c, scale));
    const pad = 8;
    const left = Math.min(...pts.map((q) => q.x)) - pad;
    const right = Math.max(...pts.map((q) => q.x)) + pad;
    const top = Math.min(...pts.map((q) => q.y)) - pad;
    const bottom = Math.max(...pts.map((q) => q.y)) + pad;
    const c = Math.min(12, (right - left) / 4, (bottom - top) / 4);
    brackets = (
      <path
        className="vp-brackets"
        d={[
          `M${left},${top + c}V${top}H${left + c}`,
          `M${right - c},${top}H${right}V${top + c}`,
          `M${right},${bottom - c}V${bottom}H${right - c}`,
          `M${left + c},${bottom}H${left}V${bottom - c}`,
        ].join('')}
      />
    );
  }

  // Gizmo size is constant on screen.
  const L = 64 / scale;
  const axes: Array<{ axis: 'x' | 'y' | 'z'; dir: Vec3 }> = [
    { axis: 'x', dir: [1, 0, 0] },
    { axis: 'y', dir: [0, 1, 0] },
    { axis: 'z', dir: [0, 0, 1] },
  ];
  const at = (dir: Vec3, k: number) =>
    project(
      [
        world.t[0] + dir[0] * k,
        world.t[1] + dir[1] * k,
        world.t[2] + dir[2] * k,
      ],
      scale,
    );

  let gizmo: ReactNode = null;
  if (tool === 'move' || tool === 'scale') {
    gizmo = axes.map(({ axis, dir }) => {
      const end = at(dir, L);
      const back = at(dir, L * 0.78);
      const nx = -(end.y - back.y);
      const ny = end.x - back.x;
      const head =
        tool === 'move' ? (
          <polygon
            points={pointsAttr([
              end,
              { x: back.x + nx * 0.35, y: back.y + ny * 0.35 },
              { x: back.x - nx * 0.35, y: back.y - ny * 0.35 },
            ])}
          />
        ) : (
          <rect x={end.x - 4} y={end.y - 4} width={8} height={8} />
        );
      return (
        <g key={axis} className={`vp-gizmo__axis vp-gizmo__axis--${axis}`}>
          <line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} />
          {head}
        </g>
      );
    });
  } else if (tool === 'rotate') {
    const ring = (plane: (a: number) => Vec3) =>
      pointsAttr(
        Array.from({ length: 64 }, (_, i) => {
          const v = plane((i / 64) * Math.PI * 2);
          return project(
            [
              world.t[0] + v[0] * L,
              world.t[1] + v[1] * L,
              world.t[2] + v[2] * L,
            ],
            scale,
          );
        }),
      );
    gizmo = (
      <>
        <circle
          className="vp-gizmo__outer"
          cx={origin.x}
          cy={origin.y}
          r={L * scale * 1.12}
        />
        <polygon
          className="vp-gizmo__ring vp-gizmo__axis--x"
          points={ring((a) => [0, Math.cos(a), Math.sin(a)])}
        />
        <polygon
          className="vp-gizmo__ring vp-gizmo__axis--y"
          points={ring((a) => [Math.cos(a), 0, Math.sin(a)])}
        />
        <polygon
          className="vp-gizmo__ring vp-gizmo__axis--z"
          points={ring((a) => [Math.cos(a), Math.sin(a), 0])}
        />
      </>
    );
  }

  return (
    <g className="vp-selection" aria-hidden="true">
      {brackets}
      {gizmo && <g className={`vp-gizmo vp-gizmo--${tool}`}>{gizmo}</g>}
      <circle
        className="vp-gizmo__center"
        cx={origin.x}
        cy={origin.y}
        r={3.5}
      />
    </g>
  );
}

// ---------- HTML overlays ----------

const fmt = (n: number) => (Math.abs(n) < 0.0005 ? 0 : n).toFixed(2);

function SelectionCard({ state }: { state: EditorState }) {
  const selected = findObject(state.objects, state.selectedId);
  if (!selected) {
    return (
      <div className="viewport__overlay viewport__overlay--top-right vp-card vp-card--empty">
        Nothing selected — click an object
      </div>
    );
  }
  const world = worldMatrix(state.objects, selected);
  const bounds = worldBounds(state.objects, selected);
  const size = bounds ? sub(bounds.max, bounds.min) : undefined;

  return (
    <div className="viewport__overlay viewport__overlay--top-right vp-card">
      <div className="vp-card__title">{selected.name}</div>
      <div className="vp-card__kind">
        {KIND_LABELS[selected.data.kind]}
        {!isEffectivelyVisible(state.objects, selected) && ' · hidden'}
      </div>
      <dl className="vp-card__grid">
        <dt>Position</dt>
        <dd className="mono">
          {world.t.map(fmt).join('  ')}{' '}
          <span className="vp-card__unit">{UNITS}</span>
        </dd>
        {size && (
          <>
            <dt>Size</dt>
            <dd className="mono">
              {size.map(fmt).join(' × ')}{' '}
              <span className="vp-card__unit">{UNITS}</span>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function AxisGizmo() {
  const R = 22;
  const axes: Array<{ id: 'x' | 'y' | 'z'; dir: Vec3 }> = [
    { id: 'x', dir: [1, 0, 0] },
    { id: 'y', dir: [0, 1, 0] },
    { id: 'z', dir: [0, 0, 1] },
  ];
  return (
    <svg
      className="axis-gizmo"
      width={64}
      height={64}
      viewBox="-32 -32 64 64"
      aria-label="World axes"
    >
      <circle className="axis-gizmo__bg" r={30} />
      {axes
        .map((a) => ({ ...a, p: project(a.dir, R), depth: depthOf(a.dir) }))
        .sort((a, b) => a.depth - b.depth)
        .map(({ id, p }) => (
          <g key={id} className={`axis-gizmo__axis axis-gizmo__axis--${id}`}>
            <line x1={0} y1={0} x2={p.x} y2={p.y} />
            <circle cx={p.x} cy={p.y} r={6} />
            <text x={p.x} y={p.y + 3}>
              {id.toUpperCase()}
            </text>
          </g>
        ))}
    </svg>
  );
}

function NavigationHints({ tool }: { tool: ToolId }) {
  const toolInfo = TOOLS.find((t) => t.id === tool);
  return (
    <div className="vp-hints" aria-label="Viewport navigation">
      <span>
        <kbd>Middle-drag</kbd> Orbit
      </span>
      <span>
        <kbd>Shift</kbd>+<kbd>Middle-drag</kbd> Pan
      </span>
      <span>
        <kbd>Scroll</kbd> Zoom
      </span>
      <span>
        <kbd>F</kbd> Frame
      </span>
      {toolInfo && (
        <span className="vp-hints__tool">
          <kbd>{toolInfo.shortcut}</kbd> {toolInfo.label}
        </span>
      )}
    </div>
  );
}

// ---------- Hooks ----------

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
