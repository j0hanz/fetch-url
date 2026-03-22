import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

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
