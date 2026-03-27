// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { useFormStatus } from 'react-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TransformForm from '@/components/features/form';
import { submitUrlForm } from '@/tests/setup';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    useFormStatus: vi.fn(),
  };
});

const mockUseFormStatus = vi.mocked(useFormStatus);

const action = vi.fn();
const VALID_URL = 'https://example.com';

describe('TransformForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseFormStatus.mockReturnValue({
      pending: false,
      data: null,
      method: null,
      action: null,
    });
  });

  it('renders URL input and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /convert/i })
    ).toBeInTheDocument();
  });

  it('submits the current URL value', async () => {
    renderForm();
    await submitUrlForm(VALID_URL);

    expect(action).toHaveBeenCalled();
    const mockCall = action.mock.calls[0];
    expect(mockCall).toBeDefined();
    if (!mockCall) return;
    const formData = mockCall[0] as FormData;
    expect(formData.get('url')).toBe(VALID_URL);
  });

  it('disables the URL input and shows loading state on button', () => {
    mockUseFormStatus.mockReturnValue({
      pending: true,
      data: new FormData(),
      method: 'get',
      action: (_formData: FormData) => {},
    });
    renderForm();

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

function renderForm() {
  return render(<TransformForm action={action} />);
}
