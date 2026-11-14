/**
 * Properties inspector for the selected object: identity, transform and dimensions.
 * Every field reads from and writes to the editor state, so edits also move the
 * object in the viewport.
 */
import { useRef, useState, type Dispatch, type ReactNode } from 'react';
import {
  KIND_LABELS,
  UNITS,
  findObject,
  type Axis,
  type EditorAction,
  type EditorState,
  type SceneObject,
  type TransformKey,
} from '../../state/editorState';
import { ChevronDownIcon, ChevronRightIcon, KIND_ICONS } from '../icons/Icons';
import { sub, worldBounds } from '../viewport/sceneGeometry';
import { NumberField } from './NumberField';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const AXES: ReadonlyArray<{
  axis: Axis;
  label: 'X' | 'Y' | 'Z';
  id: 'x' | 'y' | 'z';
}> = [
  { axis: 0, label: 'X', id: 'x' },
  { axis: 1, label: 'Y', id: 'y' },
  { axis: 2, label: 'Z', id: 'z' },
];

const TRANSFORM_ROWS: ReadonlyArray<{
  key: TransformKey;
  label: string;
  step: number;
  precision: number;
  unit: string;
}> = [
  { key: 'position', label: 'Position', step: 0.1, precision: 3, unit: UNITS },
  { key: 'rotation', label: 'Rotation', step: 1, precision: 1, unit: '°' },
  { key: 'scale', label: 'Scale', step: 0.05, precision: 3, unit: '×' },
];

export function PropertiesPanel({ state, dispatch }: PropertiesPanelProps) {
  const object = findObject(state.objects, state.selectedId);

  if (!object) {
    return (
      <div className="inspector-empty">
        <p className="inspector-empty__title">No object selected</p>
        <p className="inspector-empty__hint">
          Select an object in the viewport or the scene hierarchy to edit its
          properties.
        </p>
      </div>
    );
  }

  // `key` resets local field state (e.g. the name draft) when the selection changes.
  return (
    <ObjectInspector
      key={object.id}
      object={object}
      state={state}
      dispatch={dispatch}
    />
  );
}

function ObjectInspector({
  object,
  state,
  dispatch,
}: {
  object: SceneObject;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  const KindIcon = KIND_ICONS[object.data.kind];
  const parent = findObject(state.objects, object.parentId);
  const setParam = (param: string) => (value: number) =>
    dispatch({ type: 'setParam', id: object.id, param, value });

  return (
    <div className="inspector">
      <div className="inspector__identity">
        <span
          className={`inspector__icon inspector__icon--${object.data.kind}`}
        >
          <KindIcon size={16} />
        </span>
        <NameInput
          name={object.name}
          onRename={(name) => dispatch({ type: 'rename', id: object.id, name })}
        />
      </div>

      <Section title="Object">
        <PropertyRow label="Type">
          <span className="inspector__value">
            {KIND_LABELS[object.data.kind]}
          </span>
        </PropertyRow>
        <PropertyRow label="Parent">
          <span className="inspector__value">{parent?.name ?? 'Scene'}</span>
        </PropertyRow>
        <PropertyRow label="ID">
          <span className="inspector__value inspector__value--faint mono">
            {object.id}
          </span>
        </PropertyRow>
        <PropertyRow label="Visible">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={object.visible}
              onChange={(e) =>
                dispatch({
                  type: 'setVisible',
                  id: object.id,
                  visible: e.target.checked,
                })
              }
            />
            <span className="checkbox__box" aria-hidden="true" />
            <span className="checkbox__text">
              {object.visible ? 'Shown' : 'Hidden'}
            </span>
          </label>
        </PropertyRow>
      </Section>

      <Section title="Transform">
        {TRANSFORM_ROWS.map((row) => (
          <div className="vector-row" key={row.key}>
            <span className="vector-row__label">{row.label}</span>
            <div className="vector-row__fields">
              {AXES.map(({ axis, label, id }) => (
                <NumberField
                  key={id}
                  label={label}
                  axis={id}
                  name={`${row.label} ${label}`}
                  value={object.transform[row.key][axis]}
                  step={row.step}
                  precision={row.precision}
                  onChange={(value) =>
                    dispatch({
                      type: 'setTransform',
                      id: object.id,
                      key: row.key,
                      axis,
                      value,
                    })
                  }
                />
              ))}
            </div>
            <span className="vector-row__unit">{row.unit}</span>
          </div>
        ))}
      </Section>

      <Section title="Dimensions">
        <Dimensions object={object} state={state} setParam={setParam} />
      </Section>

      {object.data.kind === 'camera' && (
        <Section title="Lens">
          <ParamRow label="Field of View" unit="°">
            <NumberField
              label="FOV"
              name="Field of view"
              value={object.data.fov}
              step={1}
              precision={1}
              min={1}
              max={179}
              onChange={setParam('fov')}
            />
          </ParamRow>
          <ParamRow label="Clip Near" unit={UNITS}>
            <NumberField
              label="N"
              name="Near clip"
              value={object.data.near}
              step={0.01}
              min={0.001}
              onChange={setParam('near')}
            />
          </ParamRow>
          <ParamRow label="Clip Far" unit={UNITS}>
            <NumberField
              label="F"
              name="Far clip"
              value={object.data.far}
              step={10}
              precision={1}
              min={1}
              onChange={setParam('far')}
            />
          </ParamRow>
        </Section>
      )}

      {(object.data.kind === 'directionalLight' ||
        object.data.kind === 'pointLight') && (
        <Section title="Light">
          <ParamRow label="Intensity">
            <NumberField
              label="I"
              name="Intensity"
              value={object.data.intensity}
              step={0.1}
              precision={2}
              min={0}
              onChange={setParam('intensity')}
            />
          </ParamRow>
          {object.data.kind === 'pointLight' && (
            <ParamRow label="Range" unit={UNITS}>
              <NumberField
                label="R"
                name="Range"
                value={object.data.range}
                step={0.5}
                precision={2}
                min={0}
                onChange={setParam('range')}
              />
            </ParamRow>
          )}
        </Section>
      )}
    </div>
  );
}

function Dimensions({
  object,
  state,
  setParam,
}: {
  object: SceneObject;
  state: EditorState;
  setParam: (param: string) => (value: number) => void;
}) {
  const d = object.data;
  const bounds = worldBounds(state.objects, object);
  const size = bounds ? sub(bounds.max, bounds.min) : undefined;

  const worldSize = size && (
    <PropertyRow label="World Size">
      <span className="inspector__value mono">
        {size.map((n) => n.toFixed(3)).join(' × ')}
        <span className="inspector__unit"> {UNITS}</span>
      </span>
    </PropertyRow>
  );

  if (d.kind === 'cube') {
    return (
      <>
        <ParamRow label="Width" unit={UNITS}>
          <NumberField
            label="W"
            axis="x"
            name="Width"
            value={d.width}
            step={0.05}
            min={0.001}
            onChange={setParam('width')}
          />
        </ParamRow>
        <ParamRow label="Height" unit={UNITS}>
          <NumberField
            label="H"
            axis="y"
            name="Height"
            value={d.height}
            step={0.05}
            min={0.001}
            onChange={setParam('height')}
          />
        </ParamRow>
        <ParamRow label="Depth" unit={UNITS}>
          <NumberField
            label="D"
            axis="z"
            name="Depth"
            value={d.depth}
            step={0.05}
            min={0.001}
            onChange={setParam('depth')}
          />
        </ParamRow>
        {worldSize}
      </>
    );
  }
  if (d.kind === 'cylinder') {
    return (
      <>
        <ParamRow label="Radius" unit={UNITS}>
          <NumberField
            label="R"
            axis="x"
            name="Radius"
            value={d.radius}
            step={0.05}
            min={0.001}
            onChange={setParam('radius')}
          />
        </ParamRow>
        <ParamRow label="Height" unit={UNITS}>
          <NumberField
            label="H"
            axis="y"
            name="Height"
            value={d.height}
            step={0.05}
            min={0.001}
            onChange={setParam('height')}
          />
        </ParamRow>
        <ParamRow label="Segments">
          <NumberField
            label="S"
            name="Segments"
            value={d.segments}
            step={1}
            min={3}
            max={128}
            integer
            onChange={setParam('segments')}
          />
        </ParamRow>
        {worldSize}
      </>
    );
  }
  if (d.kind === 'group') {
    return (
      worldSize ?? (
        <p className="inspector__note">This group contains no geometry.</p>
      )
    );
  }
  return (
    <p className="inspector__note">
      {KIND_LABELS[d.kind]} objects have no geometric dimensions.
    </p>
  );
}

// ---------- Small building blocks ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="inspector-section">
      <button
        type="button"
        className="inspector-section__header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        {title}
      </button>
      {open && <div className="inspector-section__body">{children}</div>}
    </section>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="property-row">
      <span className="property-row__label">{label}</span>
      <div className="property-row__control">{children}</div>
    </div>
  );
}

function ParamRow({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: ReactNode;
}) {
  return (
    <div className="property-row">
      <span className="property-row__label">{label}</span>
      <div className="property-row__control property-row__control--field">
        {children}
      </div>
      <span className="vector-row__unit">{unit}</span>
    </div>
  );
}

function NameInput({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  // Same draft/cancel pattern as NumberField: blur is the only commit point,
  // the ref avoids stale closures, and Escape flags the edit as cancelled.
  const [draft, setDraftState] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const cancelled = useRef(false);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const commit = () => {
    const pending = draftRef.current;
    const wasCancelled = cancelled.current;
    cancelled.current = false;
    setDraft(null);
    if (wasCancelled || pending === null) return;
    if (pending.trim() && pending !== name) onRename(pending);
  };
  return (
    <input
      className="inspector__name"
      aria-label="Object name"
      value={draft ?? name}
      spellCheck={false}
      onFocus={() => {
        cancelled.current = false;
        setDraft(name);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}
