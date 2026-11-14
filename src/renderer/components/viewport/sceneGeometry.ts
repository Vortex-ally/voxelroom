/**
 * Minimal transform and shape math for the viewport PLACEHOLDER and the inspector.
 * This is not the geometry engine: it only produces enough data to draw the demo
 * scene as a flat SVG preview. It will be replaced by Three.js in a later step.
 */
import {
  findObject,
  type SceneObject,
  type Transform,
  type Vec3,
} from '../../state/editorState';

/** Affine transform: 3×3 linear part (row-major) plus translation. */
export interface Mat {
  m: number[];
  t: Vec3;
}

const DEG = Math.PI / 180;

export const IDENTITY: Mat = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };

function mul3(a: number[], b: number[]): number[] {
  const out: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++)
        out[r * 3 + c]! += a[r * 3 + k]! * b[k * 3 + c]!;
  return out;
}

export function applyLinear(m: number[], v: Vec3): Vec3 {
  return [
    m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2],
    m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2],
    m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2],
  ];
}

export function apply(mat: Mat, v: Vec3): Vec3 {
  const r = applyLinear(mat.m, v);
  return [r[0] + mat.t[0], r[1] + mat.t[1], r[2] + mat.t[2]];
}

/** a ∘ b: apply b first, then a. */
export function compose(a: Mat, b: Mat): Mat {
  const bt = apply(a, b.t);
  return { m: mul3(a.m, b.m), t: bt };
}

/** Rotation matrix for Euler angles in degrees, order XYZ (same as Three.js). */
export function rotationMatrix([rx, ry, rz]: Vec3): number[] {
  const [cx, sx] = [Math.cos(rx * DEG), Math.sin(rx * DEG)];
  const [cy, sy] = [Math.cos(ry * DEG), Math.sin(ry * DEG)];
  const [cz, sz] = [Math.cos(rz * DEG), Math.sin(rz * DEG)];
  const X = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Y = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Z = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return mul3(mul3(X, Y), Z);
}

export function localMatrix({ position, rotation, scale }: Transform): Mat {
  const S = [scale[0], 0, 0, 0, scale[1], 0, 0, 0, scale[2]];
  return { m: mul3(rotationMatrix(rotation), S), t: [...position] };
}

export function worldMatrix(
  objects: readonly SceneObject[],
  object: SceneObject,
): Mat {
  const parent = findObject(objects, object.parentId);
  const local = localMatrix(object.transform);
  return parent ? compose(worldMatrix(objects, parent), local) : local;
}

export interface MeshShape {
  vertices: Vec3[];
  /** Each face is a convex polygon given by vertex indices. */
  faces: number[][];
}

/** Local-space shape for mesh objects; undefined for cameras, lights and groups. */
export function meshShape(object: SceneObject): MeshShape | undefined {
  const d = object.data;
  if (d.kind === 'cube') {
    const [x, y, z] = [d.width / 2, d.height / 2, d.depth / 2];
    const vertices: Vec3[] = [
      [-x, -y, -z],
      [x, -y, -z],
      [x, y, -z],
      [-x, y, -z],
      [-x, -y, z],
      [x, -y, z],
      [x, y, z],
      [-x, y, z],
    ];
    const faces = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [3, 2, 6, 7],
      [0, 3, 7, 4],
      [1, 2, 6, 5],
    ];
    return { vertices, faces };
  }
  if (d.kind === 'cylinder') {
    const n = Math.max(3, Math.min(128, Math.round(d.segments)));
    const h = d.height / 2;
    const vertices: Vec3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      vertices.push([Math.cos(a) * d.radius, -h, Math.sin(a) * d.radius]);
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      vertices.push([Math.cos(a) * d.radius, h, Math.sin(a) * d.radius]);
    }
    const faces: number[][] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, n + j, n + i]);
    }
    faces.push([...Array(n).keys()]);
    faces.push([...Array(n).keys()].map((i) => n + i));
    return { vertices, faces };
  }
  return undefined;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** World-space axis-aligned bounds of a mesh, or of all meshes inside a group. */
export function worldBounds(
  objects: readonly SceneObject[],
  object: SceneObject,
): Bounds | undefined {
  const points: Vec3[] = [];
  const collect = (o: SceneObject) => {
    const shape = meshShape(o);
    if (shape) {
      const world = worldMatrix(objects, o);
      for (const v of shape.vertices) points.push(apply(world, v));
    }
    for (const child of objects.filter((c) => c.parentId === o.id))
      collect(child);
  };
  collect(object);
  if (points.length === 0) return undefined;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, p[i]!);
      max[i] = Math.max(max[i]!, p[i]!);
    }
  return { min, max };
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const dot = (a: Vec3, b: Vec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(...v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
export const centroid = (points: Vec3[]): Vec3 => {
  const c: Vec3 = [0, 0, 0];
  for (const p of points)
    for (let i = 0; i < 3; i++) c[i]! += p[i]! / points.length;
  return c;
};
