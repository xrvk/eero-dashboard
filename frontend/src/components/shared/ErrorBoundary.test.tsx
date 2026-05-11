import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function ThrowingChild(): React.JSX.Element {
  throw new Error('test crash');
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><p>hello</p></ErrorBoundary>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('renders fallback on error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary name="Test"><ThrowingChild /></ErrorBoundary>);
    expect(screen.getByText(/Something went wrong/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    vi.restoreAllMocks();
  });
});
