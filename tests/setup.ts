import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import type { TransformResult } from '@/lib/api';

export const VALID_URL = 'https://example.com';

export const MOCK_TRANSFORM_RESULT: TransformResult = {
  url: VALID_URL,
  resolvedUrl: 'https://example.com/',
  finalUrl: 'https://example.com/',
  title: 'Example Domain',
  metadata: {
    description: 'An example page',
    author: 'IANA',
  },
  markdown: '# Example\n\nThis is an example.',
  fetchedAt: '2026-03-10T12:00:00.000Z',
  contentSize: 42,
  truncated: false,
};

if (
  typeof window !== 'undefined' &&
  typeof HTMLFormElement !== 'undefined' &&
  typeof HTMLFormElement.prototype.requestSubmit !== 'function'
) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true })
    );
  };
}

afterEach(() => {
  cleanup();
});

export async function submitUrlForm(url: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/URL/i);

  await user.clear(input);
  await user.type(input, url);
  await user.click(screen.getByRole('button', { name: /convert/i }));
}
