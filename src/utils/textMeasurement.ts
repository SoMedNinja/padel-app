
let canvas: HTMLCanvasElement | null = null;

export function getTextWidth(text: string, font: string = '14px Roboto'): number {
  if (typeof document === 'undefined') return text.length * 8; // SSR fallback
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  const context = canvas.getContext('2d');
  if (!context) return text.length * 8;
  context.font = font;
  const metrics = context.measureText(text);
  return Math.ceil(metrics.width);
}
