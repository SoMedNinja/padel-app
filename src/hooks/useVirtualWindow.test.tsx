import { render, act } from '@testing-library/react';
import { useVirtualWindow } from './useVirtualWindow';
import React from 'react';

// Mock ResizeObserver
const resizeCallbacks = new Map<Element, (entries: any[]) => void>();

class MockResizeObserver {
  callback: (entries: any[]) => void;
  constructor(callback: (entries: any[]) => void) {
    this.callback = callback;
  }
  observe(element: Element) {
    resizeCallbacks.set(element, this.callback);
  }
  disconnect() {}
  unobserve() {}
}

global.ResizeObserver = MockResizeObserver as any;

const TestComponent = ({ onRender }: { onRender: () => void }) => {
  onRender();
  const { parentRef, virtualItems, measureElement } = useVirtualWindow({
    itemCount: 100,
    estimateSize: 50,
  });

  return (
    <div ref={parentRef} style={{ height: 500, overflow: 'auto' }}>
      {virtualItems.map((item) => (
        <div
          key={item.index}
          ref={measureElement(item.index)}
          style={{ height: item.size }}
        >
          Row {item.index}
        </div>
      ))}
    </div>
  );
};

test('measures render count on multiple size updates', async () => {
  let renderCount = 0;
  const { getAllByText } = render(<TestComponent onRender={() => renderCount++} />);

  // Reset count after initial render
  renderCount = 0;

  // Simulate size changes for multiple items
  const elements = getAllByText(/Row/);

  // Simulate updates for as many elements as we found, breaking batching
  for (let i = 0; i < elements.length; i++) {
    await act(async () => {
        const element = elements[i];
        const callback = resizeCallbacks.get(element);
        if (callback) {
           callback([{ contentRect: { height: 60 + i } }]);
        }
        // Force a tick
        await new Promise(r => setTimeout(r, 0));
    });
  }

  // With optimization, we expect this to be significantly lower (e.g. <= 4)
  // Without optimization, it was 12 for 4 items.
  // We set a threshold of 5 to allow for some noise but catch the unbatched behavior.
  expect(renderCount).toBeLessThan(5);
});
