import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getTextWidth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return fallback width when document is undefined (SSR)', async () => {
    vi.stubGlobal('document', undefined);

    // Dynamic import to ensure module evaluates with mocked global
    const { getTextWidth } = await import('./textMeasurement');

    expect(getTextWidth('hello')).toBe(40); // 5 * 8
  });

  it('should create canvas and measure text correctly', async () => {
    const mockContext = {
      measureText: vi.fn().mockReturnValue({ width: 42.1 }),
      font: '',
    };
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
    };

    const createElementSpy = vi.fn().mockReturnValue(mockCanvas);
    vi.stubGlobal('document', {
      createElement: createElementSpy,
    });

    const { getTextWidth } = await import('./textMeasurement');

    const width = getTextWidth('test string', '16px Arial');

    expect(createElementSpy).toHaveBeenCalledWith('canvas');
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mockContext.font).toBe('16px Arial');
    expect(mockContext.measureText).toHaveBeenCalledWith('test string');
    expect(width).toBe(43); // Math.ceil(42.1)
  });

  it('should use default font if not provided', async () => {
    const mockContext = {
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      font: '',
    };
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    });

    const { getTextWidth } = await import('./textMeasurement');
    getTextWidth('test');

    expect(mockContext.font).toBe('14px Roboto');
  });

  it('should return fallback width if context is null', async () => {
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    });

    const { getTextWidth } = await import('./textMeasurement');
    expect(getTextWidth('hello')).toBe(40); // 5 * 8
  });

  it('should reuse canvas instance across calls', async () => {
    const mockContext = {
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      font: '',
    };
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
    };

    const createElementSpy = vi.fn().mockReturnValue(mockCanvas);
    vi.stubGlobal('document', {
      createElement: createElementSpy,
    });

    const { getTextWidth } = await import('./textMeasurement');

    getTextWidth('one');
    getTextWidth('two');

    expect(createElementSpy).toHaveBeenCalledTimes(1);
    expect(mockCanvas.getContext).toHaveBeenCalledTimes(2);
  });
});
