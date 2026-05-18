import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from 'antd';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title + description + action', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No assets yet"
        description="Create your first asset to get started."
        action={<Button onClick={onClick}>New Asset</Button>}
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No assets yet')).toBeInTheDocument();
    expect(screen.getByText(/Create your first asset/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new asset/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders without any optional props', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
