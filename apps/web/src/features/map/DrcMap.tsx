import { useMemo, useState } from 'react';
import { ENTRY_POINTS, PROVINCES, type ProvinceCode } from '@acorep/shared';
import { useI18n } from '@/i18n';
import { DRC_VIEWBOX, PROVINCE_SHAPES, project } from './drcShapes';

/** Sequential blues, light → dark. Index 0 is reserved for "no data / zero". */
const PALETTE = ['#eef2f7', '#d6e6f8', '#9ec5ee', '#5b9ae0', '#1f6fc9', '#0b3f86'];

/**
 * Quantile breaks over non-zero values: Kinshasa alone would otherwise flatten every other
 * province into the lightest class with a linear scale.
 */
export function classBreaks(values: number[], classes = PALETTE.length - 1): number[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const breaks: number[] = [];
  for (let i = 1; i < classes; i++) {
    const v = sorted[Math.min(sorted.length - 1, Math.floor((i / classes) * sorted.length))]!;
    if (!breaks.length || v > breaks[breaks.length - 1]!) breaks.push(v);
  }
  return breaks;
}

export function classOf(value: number, breaks: number[]): number {
  if (value <= 0) return 0;
  let c = 1;
  for (const b of breaks) if (value >= b) c += 1;
  return c;
}

interface Props {
  values: Record<ProvinceCode, number>;
  format: (v: number) => string;
  /** Unit label for screen readers and the tooltip, e.g. "officines". */
  label: string;
  selected: ProvinceCode | null;
  onSelect: (p: ProvinceCode | null) => void;
  showEntryPoints?: boolean;
}

export function DrcMap({ values, format, label, selected, onSelect, showEntryPoints = true }: Props) {
  const { t, f } = useI18n();
  const [hover, setHover] = useState<ProvinceCode | null>(null);
  const breaks = useMemo(() => classBreaks(Object.values(values)), [values]);
  const focus = hover ?? selected;
  const focusInfo = focus ? PROVINCES.find((p) => p.code === focus) : null;

  // Legend: "1 – 4", "5 – 11", … built from the breaks.
  const legend = useMemo(() => {
    const max = Math.max(0, ...Object.values(values));
    const edges = [0, ...breaks, max + 1];
    return edges.slice(0, -1).map((lo, i) => {
      const hi = edges[i + 1]! - (Number.isInteger(edges[i + 1]) ? 1 : 0);
      return {
        color: PALETTE[i + 1]!,
        text: i === 0 ? `≤ ${format(Math.max(hi, 0))}` : `${format(lo)} – ${format(hi)}`,
      };
    });
  }, [breaks, values, format]);

  return (
    <div className="relative">
      <svg
        viewBox={`-10 -10 ${DRC_VIEWBOX.width + 20} ${DRC_VIEWBOX.height + 20}`}
        className="h-auto w-full"
        role="group"
        aria-label={t.dashboard.mapTitle}
      >
        {PROVINCES.map((p) => {
          const shape = PROVINCE_SHAPES[p.code];
          const v = values[p.code];
          const isSel = selected === p.code;
          return (
            <path
              key={p.code}
              d={shape.d}
              className="province"
              fill={PALETTE[classOf(v, breaks)]}
              stroke={isSel ? '#0c1f3f' : '#ffffff'}
              strokeWidth={isSel ? 3 : 1.2}
              strokeLinejoin="round"
              tabIndex={0}
              role="button"
              aria-pressed={isSel}
              aria-label={`${p.name} : ${format(v)} ${label}`}
              onMouseEnter={() => setHover(p.code)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.code)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(isSel ? null : p.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(isSel ? null : p.code);
                }
              }}
            />
          );
        })}
        {/* Selected outline on top so neighbours don't cover it. */}
        {selected && (
          <path d={PROVINCE_SHAPES[selected].d} fill="none" stroke="#0c1f3f" strokeWidth={3} pointerEvents="none" />
        )}
        {/* Provincial capitals */}
        {PROVINCES.map((p) => {
          const { x, y } = project(p.lon, p.lat);
          return (
            <circle
              key={p.code}
              cx={x}
              cy={y}
              r={3.2}
              fill="#0c1f3f"
              stroke="#fff"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          );
        })}
        {/* Points of entry: diamond = seaport, triangle = airport */}
        {showEntryPoints &&
          ENTRY_POINTS.map((e) => {
            const { x, y } = project(e.lon, e.lat);
            const s = 8;
            const pts =
              e.mode === 'SEA'
                ? `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`
                : `${x},${y - s} ${x + s},${y + s * 0.8} ${x - s},${y + s * 0.8}`;
            return (
              <polygon
                key={e.id}
                points={pts}
                fill={e.mode === 'SEA' ? '#0e7490' : '#7c3aed'}
                stroke="#fff"
                strokeWidth={1.5}
                pointerEvents="none"
              >
                <title>{e.name}</title>
              </polygon>
            );
          })}
      </svg>

      {/* Hover / focus readout */}
      <div aria-live="polite" className="pointer-events-none absolute left-3 top-3 min-h-12 max-w-[60%]">
        {focusInfo && (
          <div className="rounded-lg border border-line bg-white/95 px-3 py-2 shadow-card backdrop-blur">
            <p className="text-sm font-semibold text-ink">{focusInfo.name}</p>
            <p className="text-xs text-ink-soft">{f(t.dashboard.provinceCapital, { city: focusInfo.capital })}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-ink">
              {format(values[focusInfo.code])} <span className="font-medium text-ink-soft">{label}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm ring-1 ring-line" style={{ background: PALETTE[0] }} />
          {t.dashboard.legendNone}
        </span>
        {legend.map((l) => (
          <span key={l.text} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: l.color }} />
            <span className="tabular-nums">{l.text}</span>
          </span>
        ))}
        {showEntryPoints && (
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <polygon points="6,0 12,6 6,12 0,6" fill="#0e7490" />
              </svg>
              {t.common.sea}
            </span>
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <polygon points="6,0 12,11 0,11" fill="#7c3aed" />
              </svg>
              {t.common.air}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
