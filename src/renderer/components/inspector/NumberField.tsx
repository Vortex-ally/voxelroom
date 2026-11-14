/**
 * Compact numeric input used by the inspector.
 * - Type a value, then Enter or click away to apply; Escape cancels.
 * - ↑/↓ nudge by `step` (Shift ×10).
 * - Drag the label left/right to scrub the value.
 */
import { useRef, useState, type PointerEvent } from 'react';

interface NumberFieldProps {
  label: string;
  /** Accessible name, e.g. "Position X". */
  name: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  unit?: string;
  /** CSS modifier for colored axis labels: 'x' | 'y' | 'z'. */
  axis?: 'x' | 'y' | 'z';
}

export function NumberField({
  label,
  name,
  value,
  onChange,
  step = 0.1,
  precision = 3,
  min = -Infinity,
  max = Infinity,
  integer = false,
  unit,
  axis,
}: NumberFieldProps) {
  // The draft is mirrored in a ref so the blur handler never reads a stale
  // closure value, and `cancelled` lets Escape skip the commit that the
  // following blur would otherwise perform.
  const [draft, setDraftState] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const cancelled = useRef(false);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const scrub = useRef<{ startX: number; startValue: number } | null>(null);

  const clamp = (n: number) => {
    const bounded = Math.min(max, Math.max(min, n));
    return integer ? Math.round(bounded) : Number(bounded.toFixed(precision));
  };
  const display = (
    Math.abs(value) < 0.5 * 10 ** -precision ? 0 : value
  ).toFixed(integer ? 0 : precision);

  /** Runs on blur, the single place where an edit is applied. */
  const commit = () => {
    const pending = draftRef.current;
    const wasCancelled = cancelled.current;
    cancelled.current = false;
    setDraft(null);
    if (wasCancelled || pending === null) return;
    const parsed = Number.parseFloat(pending.replace(',', '.'));
    if (Number.isFinite(parsed)) onChange(clamp(parsed));
  };

  const onLabelPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrub.current = { startX: e.clientX, startValue: value };
  };
  const onLabelPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!scrub.current) return;
    const dx = e.clientX - scrub.current.startX;
    const speed = e.shiftKey ? 1 : 0.1; // fine control by default, Shift for coarse
    onChange(clamp(scrub.current.startValue + dx * step * speed * 2));
  };
  const endScrub = () => {
    scrub.current = null;
  };

  return (
    <div className={`number-field${axis ? ` number-field--${axis}` : ''}`}>
      <span
        className="number-field__label"
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        title="Drag to adjust"
      >
        {label}
      </span>
      <input
        className="number-field__input mono"
        type="text"
        inputMode="decimal"
        aria-label={name}
        spellCheck={false}
        value={draft ?? display}
        onFocus={(e) => {
          cancelled.current = false;
          setDraft(display);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Blur performs the (single) commit.
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            cancelled.current = true;
            e.currentTarget.blur();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const base = Number.parseFloat(draftRef.current ?? display);
            const delta =
              (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            const next = clamp((Number.isFinite(base) ? base : value) + delta);
            onChange(next);
            setDraft(next.toFixed(integer ? 0 : precision));
          }
        }}
      />
      {unit && <span className="number-field__unit">{unit}</span>}
    </div>
  );
}
