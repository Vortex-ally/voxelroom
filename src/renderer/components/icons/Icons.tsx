/**
 * Hand-drawn 16×16 line icons (no icon library). They inherit `currentColor`.
 */
import type { ReactNode, SVGProps } from 'react';
import type { ObjectKind, ToolId } from '../../state/editorState';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({
  size = 16,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SelectIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 2.5 12 8.2l-3.8.7 2.1 4.2-1.6.8-2.1-4.2-2.9 2.6z" />
  </Icon>
);

export const MoveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.8v12.4M1.8 8h12.4" />
    <path d="M6.2 3.6 8 1.8l1.8 1.8M6.2 12.4 8 14.2l1.8-1.8M3.6 6.2 1.8 8l1.8 1.8M12.4 6.2 14.2 8l-1.8 1.8" />
  </Icon>
);

export const RotateIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M11.8 1.9v2.6H9.2" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const ScaleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="7" width="7" height="7" rx="0.5" />
    <path d="M6.5 9.5 13.5 2.5M9.5 2.5h4v4" />
  </Icon>
);

export const TOOL_ICONS: Record<ToolId, (p: IconProps) => ReactNode> = {
  select: SelectIcon,
  move: MoveIcon,
  rotate: RotateIcon,
  scale: ScaleIcon,
};

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.8" y="4.5" width="9" height="7" rx="1" />
    <path d="m10.8 7 3.4-2v6l-3.4-2" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
  </Icon>
);

export const BulbIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.6 10.4A4.3 4.3 0 1 1 10.4 10.4c-.5.4-.7.9-.7 1.4v.4H6.3v-.4c0-.5-.2-1-.7-1.4Z" />
    <path d="M6.4 14.3h3.2" />
  </Icon>
);

export const CubeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.8 13.6 5v6.2L8 14.3 2.4 11.2V5Z" />
    <path d="M2.4 5 8 8.1 13.6 5M8 8.1v6.2" />
  </Icon>
);

export const CylinderIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="8" cy="3.8" rx="4.8" ry="1.9" />
    <path d="M3.2 3.8v8.4c0 1 2.1 1.9 4.8 1.9s4.8-.9 4.8-1.9V3.8" />
  </Icon>
);

export const GroupIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.8 4.2c0-.6.4-1 1-1h3.3l1.4 1.5h5.7c.6 0 1 .4 1 1v6.9c0 .6-.4 1-1 1H2.8c-.6 0-1-.4-1-1Z" />
  </Icon>
);

export const KIND_ICONS: Record<ObjectKind, (p: IconProps) => ReactNode> = {
  group: GroupIcon,
  camera: CameraIcon,
  directionalLight: SunIcon,
  pointLight: BulbIcon,
  cube: CubeIcon,
  cylinder: CylinderIcon,
};

export const SceneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2 14 5.2 8 8.4 2 5.2Z" />
    <path d="m2 8 6 3.2L14 8M2 10.8 8 14l6-3.2" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.3 4A6.6 6.6 0 0 1 8 3.8c4 0 6.5 4.2 6.5 4.2a11 11 0 0 1-1.9 2.4M10.7 11.6A6.3 6.3 0 0 1 8 12.2C4 12.2 1.5 8 1.5 8a11.3 11.3 0 0 1 2.7-3" />
    <path d="m2 2 12 12" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 4 4 4-4 4" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4 6 4 4 4-4" />
  </Icon>
);

export const PanelLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.8" y="2.5" width="12.4" height="11" rx="1.2" />
    <path d="M6 2.5v11" />
  </Icon>
);

export const PanelRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.8" y="2.5" width="12.4" height="11" rx="1.2" />
    <path d="M10 2.5v11" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.2 8.3 3 3 6.6-6.6" />
  </Icon>
);

export const CursorIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2v3M8 11v3M2 8h3M11 8h3" />
    <circle cx="8" cy="8" r="1.2" />
  </Icon>
);

/** VoxelRoom mark: an isometric voxel with a highlighted top face. */
export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
      className="logo-mark"
    >
      <path className="logo-mark__top" d="M9 1.5 15.5 5.2 9 8.9 2.5 5.2Z" />
      <path className="logo-mark__left" d="M2.5 5.2 9 8.9v7.6L2.5 12.8Z" />
      <path className="logo-mark__right" d="M15.5 5.2 9 8.9v7.6l6.5-3.7Z" />
    </svg>
  );
}
