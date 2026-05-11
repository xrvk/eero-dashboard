import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression test: AppContent must NOT use React.lazy() or Suspense.
 * Lazy loading causes a visible spinner flash on first tab visit.
 * All tab components must be eagerly imported.
 */
describe('AppContent eager imports', () => {
  const filePath = path.resolve(__dirname, './AppContent.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('does not use React.lazy()', () => {
    expect(source).not.toMatch(/\blazy\s*\(/);
  });

  it('does not use <Suspense>', () => {
    expect(source).not.toMatch(/<Suspense/);
  });

  it('does not import lazy from react', () => {
    expect(source).not.toMatch(/import\s*\{[^}]*\blazy\b[^}]*\}\s*from\s*['"]react['"]/);
  });

  it('eagerly imports DeviceList', () => {
    expect(source).toMatch(/import\s+DeviceList\s+from/);
  });

  it('eagerly imports ActivityView', () => {
    expect(source).toMatch(/import\s+ActivityView\s+from/);
  });

  it('eagerly imports ProfileManager', () => {
    expect(source).toMatch(/import\s+ProfileManager\s+from/);
  });

  it('eagerly imports GuestNetwork', () => {
    expect(source).toMatch(/import\s+GuestNetwork\s+from/);
  });

  it('eagerly imports GeneralSettings from SettingsView', () => {
    expect(source).toMatch(/import\s*\{[^}]*GeneralSettings[^}]*\}\s*from/);
  });
});
