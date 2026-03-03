import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from './authErrorMapper';
import { AuthError } from '../services/authUtils';

describe('getAuthErrorMessage', () => {
  it('should return the message from an AuthError instance', () => {
    const error = new AuthError('not-admin', 'You are not an admin');
    const result = getAuthErrorMessage(error, 'Fallback error');
    expect(result).toBe('You are not an admin');
  });

  it('should return the message from a standard Error object', () => {
    const error = new Error('Something went wrong');
    const result = getAuthErrorMessage(error, 'Fallback error');
    expect(result).toBe('Something went wrong');
  });

  it('should return the message from an object with a message property', () => {
    const error = { message: 'Custom error message' };
    const result = getAuthErrorMessage(error, 'Fallback error');
    expect(result).toBe('Custom error message');
  });

  it('should return the fallback message if the error message is empty or whitespace', () => {
    expect(getAuthErrorMessage({ message: '' }, 'Fallback error')).toBe('Fallback error');
    expect(getAuthErrorMessage({ message: '   ' }, 'Fallback error')).toBe('Fallback error');
  });

  it('should trim the error message', () => {
    expect(getAuthErrorMessage({ message: '  Error with spaces  ' }, 'Fallback error')).toBe('Error with spaces');
  });

  it('should handle non-string message properties correctly', () => {
    // Number message - should be stringified
    expect(getAuthErrorMessage({ message: 123 }, 'Fallback error')).toBe('123');

    // Null message -> should return fallback
    expect(getAuthErrorMessage({ message: null }, 'Fallback error')).toBe('Fallback error');

    // Undefined message -> should return fallback
    expect(getAuthErrorMessage({ message: undefined }, 'Fallback error')).toBe('Fallback error');

    // Boolean message -> should return fallback (not "true")
    expect(getAuthErrorMessage({ message: true }, 'Fallback error')).toBe('Fallback error');

    // Object message -> should return fallback (not "[object Object]")
    expect(getAuthErrorMessage({ message: { key: 'val' } }, 'Fallback error')).toBe('Fallback error');

    // Array message -> should return fallback (not "1,2,3")
    expect(getAuthErrorMessage({ message: [1, 2, 3] }, 'Fallback error')).toBe('Fallback error');
  });

  it('should return the fallback message for unknown error types', () => {
    expect(getAuthErrorMessage(null, 'Fallback error')).toBe('Fallback error');
    expect(getAuthErrorMessage(undefined, 'Fallback error')).toBe('Fallback error');
    expect(getAuthErrorMessage('Just a string', 'Fallback error')).toBe('Fallback error');
    expect(getAuthErrorMessage(123, 'Fallback error')).toBe('Fallback error');
    expect(getAuthErrorMessage({}, 'Fallback error')).toBe('Fallback error');
  });
});
