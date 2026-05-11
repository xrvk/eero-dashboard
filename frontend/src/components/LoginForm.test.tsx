import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoginForm from './LoginForm';

vi.mock('../api', () => ({
  login: vi.fn().mockResolvedValue({ status: 'verification_required', message: 'Code sent' }),
  verify: vi.fn().mockResolvedValue({ status: 'authenticated' }),
}));

describe('LoginForm', () => {
  it('handles auth flow through verification', async () => {
    const onAuthenticated = vi.fn();
    render(<LoginForm onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText('Email or Phone'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByLabelText('Verification Code');
    fireEvent.change(screen.getByLabelText('Verification Code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
  });
});
