import { useState, useCallback } from 'react';

export default function CopyableValue({ value }: { value: string | undefined }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  if (!value) return <span className="drawer-value mono">—</span>;
  return (
    <span
      className={`drawer-value mono copyable${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title="Click to copy"
    >
      {copied ? '✓ Copied' : value}
    </span>
  );
}
