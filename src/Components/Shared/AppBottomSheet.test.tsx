import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import AppBottomSheet from './AppBottomSheet';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

describe('AppBottomSheet', () => {
  test('renders close button with aria-label', () => {
    const theme = createTheme();
    render(
      <ThemeProvider theme={theme}>
        <AppBottomSheet open={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </AppBottomSheet>
      </ThemeProvider>
    );

    const closeButton = screen.getByRole('button', { name: /stäng/i });
    expect(closeButton).toBeInTheDocument();
  });

  test('associates title with dialog using aria-labelledby', () => {
    const theme = createTheme();
    render(
      <ThemeProvider theme={theme}>
        <AppBottomSheet open={true} onClose={() => {}} title="My Sheet Title">
          <div>Content</div>
        </AppBottomSheet>
      </ThemeProvider>
    );

    const dialog = screen.getByRole('dialog');
    const title = screen.getByText("My Sheet Title");

    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(title.id).toMatch(/^sheet-title-/);
  });
});
