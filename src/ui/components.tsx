import type { CSSProperties, ReactNode, PointerEvent } from "react";

// Shared, RTL-agnostic UI primitives. All interactive elements meet the minimum
// touch target; `kids` bumps to the age-5 size.

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  kids?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
  /**
   * Only for actions that are genuinely impossible right now — an empty form
   * field, a request already in flight. NEVER as a way of telling a child they
   * have not earned something: this platform answers that with a gentle shake
   * and no words, so an unaffordable item stays tappable.
   */
  disabled?: boolean;
}) {
  const { children, onClick, variant = "primary", kids, style, ariaLabel, disabled } = props;
  const min = kids ? "var(--tap-kids)" : "var(--tap)";
  // The theme owns what "primary" is filled with. Night's --brand-fill is the
  // exact gradient this line used to hardcode; market's is a flat colour, and
  // `background` takes either, so there is no branch and no class here.
  const bg = variant === "primary" ? "var(--brand-fill)" : "var(--surface-2)";
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.45 : 1,
        minHeight: min,
        minWidth: min,
        padding: "0 var(--space-5)",
        border: "none",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: "var(--text)",
        fontSize: kids ? 22 : 17,
        fontWeight: 700,
        boxShadow: "var(--shadow-1)",
        transition: "transform 0.12s var(--ease)",
        ...style,
      }}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
      }}
      onPointerUp={(e: PointerEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

export function IconButton(props: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  active?: boolean;
}) {
  const { children, onClick, ariaLabel, active } = props;
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: "var(--tap)",
        height: "var(--tap)",
        display: "grid",
        placeItems: "center",
        border: "none",
        borderRadius: "var(--radius-2)",
        background: active ? "var(--brand)" : "var(--surface-2)",
        color: "var(--text)",
        fontSize: 22,
        boxShadow: "var(--shadow-1)",
      }}
    >
      {children}
    </button>
  );
}

export function Stat(props: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-2)",
        padding: "var(--space-2) var(--space-4)",
        textAlign: "center",
        minWidth: 72,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{props.label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{props.value}</div>
    </div>
  );
}
