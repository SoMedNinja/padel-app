import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import ScoreSelector from './ScoreSelector';

describe('ScoreSelector', () => {
  test('renders as radiogroup with radio buttons', () => {
    const Wrapper = () => {
        const [val, setVal] = useState("0");
        return <ScoreSelector value={val} onChange={setVal} showExtraScores={false} setShowExtraScores={() => {}} />;
    }
    render(<Wrapper />);

    const group = screen.getByRole('radiogroup', { name: /välj poäng/i });
    expect(group).toBeTruthy();

    const option0 = screen.getByRole('radio', { name: /poäng: 0/i });
    expect(option0).toBeTruthy();
    expect(option0.getAttribute('aria-checked')).toBe('true');

    const option1 = screen.getByRole('radio', { name: /poäng: 1/i });
    expect(option1).toBeTruthy();
    expect(option1.getAttribute('aria-checked')).toBe('false');
  });
});
