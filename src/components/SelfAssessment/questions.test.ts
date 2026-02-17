import { describe, it, expect } from 'vitest';
import { calculateLevel } from './questions';

describe('calculateLevel', () => {
  it('should return level 0 for 0 points', () => {
    expect(calculateLevel(0).id).toBe(0);
  });

  it('should return level 0.5 for 5 points', () => {
    expect(calculateLevel(5).id).toBe(0.5);
  });

  it('should return level 1.0 for 10 points', () => {
    expect(calculateLevel(10).id).toBe(1.0);
  });

  it('should return level 3.0 for 50 points', () => {
    expect(calculateLevel(50).id).toBe(3.0);
  });

  it('should return level 5.5 for 100 points', () => {
    expect(calculateLevel(100).id).toBe(5.5);
  });

  it('should return level 7.0 for 200 points', () => {
    expect(calculateLevel(200).id).toBe(7.0);
  });

  it('should handle boundary conditions correctly', () => {
    expect(calculateLevel(109).id).toBe(5.5);
    expect(calculateLevel(110).id).toBe(6.0);
  });
});
