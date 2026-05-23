interface DemoBannerProps {
  visible: boolean;
}

export default function DemoBanner({ visible }: DemoBannerProps) {
  if (!visible) return null;
  return (
    <div className="demo-banner" role="status" aria-live="polite">
      <span className="demo-banner-icon" aria-hidden="true">🎭</span>
      <span className="demo-banner-text">
        Demo mode — all data is synthetic. Disable by unsetting{' '}
        <code className="demo-banner-code">EERO_DEMO_DATA</code>.
      </span>
    </div>
  );
}
