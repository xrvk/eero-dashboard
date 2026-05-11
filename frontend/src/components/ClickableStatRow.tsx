interface ClickableStatRowProps {
  label: string;
  count: number;
  total: number;
  barClass: string;
  onClick?: () => void;
  tooltip?: string;
}

export default function ClickableStatRow({ label, count, total, barClass, onClick, tooltip }: ClickableStatRowProps) {
  const pct = Math.max(5, (count / (total || 1)) * 100);

  return (
    <div
      className={`band-row${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      title={tooltip}
    >
      <span className="band-label">{label}</span>
      <div className="band-bar-track">
        <div
          className={`band-bar-fill ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="band-count">{count}</span>
      {onClick && <span className="band-link-arrow">→</span>}
    </div>
  );
}
