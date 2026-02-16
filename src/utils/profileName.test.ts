import { describe, it, expect, vi } from 'vitest';
import { stripBadgeLabelFromName } from './profileName';
import { getBadgeLabelById } from './badges';

// Mock the dependencies
vi.mock('./badges', () => ({
  getBadgeLabelById: vi.fn(),
}));

describe('stripBadgeLabelFromName', () => {
  it('should return the name unchanged if it has no badge', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('');
    expect(stripBadgeLabelFromName('John Doe')).toBe('John Doe');
  });

  it('should strip the badge label if badgeId is provided and matches', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('🏆 I');
    expect(stripBadgeLabelFromName('Jane Doe 🏆 I', 'some-badge-id')).toBe('Jane Doe');
  });

  it('should handle whitespace around name and badge', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('🔥 V');
    expect(stripBadgeLabelFromName('  Bob Smith  🔥 V  ', 'streak-5')).toBe('Bob Smith');
  });

  it('should strip badge using regex if badgeId is not provided', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('');
    // Test for emoji + roman numeral
    expect(stripBadgeLabelFromName('Alice 🌟 III')).toBe('Alice');
    // Test for just emoji
    expect(stripBadgeLabelFromName('Alice 🌟')).toBe('Alice');
  });

  it('should strip badge using regex even if provided badgeId does not match', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('🏆 I');
    // The name ends with a DIFFERENT badge pattern
    expect(stripBadgeLabelFromName('Charlie 🥈 II', 'some-other-badge')).toBe('Charlie');
  });

  it('should return empty string if name is empty or whitespace', () => {
    expect(stripBadgeLabelFromName('')).toBe('');
    expect(stripBadgeLabelFromName('   ')).toBe('');
  });

  it('should not strip badge if it is part of the name (not at end)', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('🏆');
    // Regex is anchored to end $, so this should hold.
    expect(stripBadgeLabelFromName('The 🏆 Team')).toBe('The 🏆 Team');
  });

  it('should handle name that is just the badge', () => {
    vi.mocked(getBadgeLabelById).mockReturnValue('🏆 I');
    expect(stripBadgeLabelFromName('🏆 I', 'badge-id')).toBe('');
  });

  it('should strip multiple badges (one by ID, one by regex)', () => {
     vi.mocked(getBadgeLabelById).mockReturnValue('🏆 I');
     // "Name 🍔 🏆 I" -> removes "🏆 I" first -> "Name 🍔" -> removes "🍔" by regex -> "Name"
     expect(stripBadgeLabelFromName('Double Badge 🍔 🏆 I', 'badge-id')).toBe('Double Badge');
  });
});
