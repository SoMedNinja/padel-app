import React from 'react';
import { render, screen } from '@testing-library/react';
import AppBottomSheet from './AppBottomSheet';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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
    expect(closeButton).toBeTruthy();
  });
});
