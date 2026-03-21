// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MarkdownPreview from '@/components/markdown-preview';

describe('MarkdownPreview', () => {
  it('renders GFM tables and callouts for richer informational content', () => {
    render(
      <MarkdownPreview>
        {`> Public pages only

| Item | Details |
| --- | --- |
| Output | Clean Markdown |`}
      </MarkdownPreview>
    );

    expect(screen.getByText('Public pages only')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Item' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Clean Markdown' })
    ).toBeInTheDocument();
  });
});
