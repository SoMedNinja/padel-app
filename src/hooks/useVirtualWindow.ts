import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

type VirtualItem = {
  index: number;
  start: number;
  size: number;
};

interface VirtualWindowOptions {
  itemCount: number;
  estimateSize: number;
  overscan?: number;
}

export function useVirtualWindow({
  itemCount,
  estimateSize,
  overscan = 4,
}: VirtualWindowOptions) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const itemSizes = useRef<Map<number, number>>(new Map());
  const observers = useRef<Map<number, ResizeObserver>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [sizesVersion, setSizesVersion] = useState(0);

  useLayoutEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    // Note for non-coders: we listen to scroll + resize so we only render rows near what you can see.
    const handleScroll = () => setScrollTop(element.scrollTop);
    handleScroll();
    element.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    resizeObserver.observe(element);
    return () => {
      element.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const [sizes, setSizes] = useState<number[]>([]);

  useLayoutEffect(() => {
    // Note for non-coders: we track row heights as they render so the scrollbar stays accurate.
    // We use sizesVersion to trigger re-calculation when a new height is measured.
    // Optimization: using a manual for-loop is faster than Array.from for large lists.
    const list = new Array(itemCount);
    const measuredSizes = itemSizes.current;
    for (let i = 0; i < itemCount; i++) {
      list[i] = measuredSizes.get(i) ?? estimateSize;
    }
    setSizes(list);
  }, [estimateSize, itemCount, sizesVersion]);

  const { totalSize, offsets } = useMemo(() => {
    const nextOffsets: number[] = [];
    let current = 0;
    for (let index = 0; index < sizes.length; index += 1) {
      nextOffsets[index] = current;
      current += sizes[index];
    }
    return { totalSize: current, offsets: nextOffsets };
  }, [sizes]);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (itemCount === 0 || !offsets.length) return [];

    // Note for non-coders: Use binary search (O(log N)) instead of linear scan (O(N))
    // to find the range of visible items, which is much faster as the list grows.
    const binarySearch = (comparison: (idx: number) => boolean) => {
      let low = 0;
      let high = itemCount - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (comparison(mid)) low = mid + 1;
        else high = mid - 1;
      }
      return low;
    };

    let startIndex = binarySearch((idx) => offsets[idx] + (sizes[idx] ?? estimateSize) <= scrollTop);
    const viewportBottom = scrollTop + viewportHeight;
    let endIndex = binarySearch((idx) => offsets[idx] < viewportBottom);

    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(itemCount, endIndex + overscan);

    const items: VirtualItem[] = [];
    for (let index = startIndex; index < endIndex; index += 1) {
      items.push({
        index,
        start: offsets[index],
        size: sizes[index],
      });
    }
    return items;
  }, [itemCount, offsets, overscan, scrollTop, sizes, viewportHeight, estimateSize]);

  const measureElement = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      const existingObserver = observers.current.get(index);
      if (existingObserver) {
        existingObserver.disconnect();
        observers.current.delete(index);
      }
      if (!node) return;
      const updateSize = (height: number) => {
        if (itemSizes.current.get(index) !== height) {
          itemSizes.current.set(index, height);
          setSizesVersion((version) => version + 1);
        }
      };
      updateSize(node.getBoundingClientRect().height);
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) updateSize(entry.contentRect.height);
      });
      resizeObserver.observe(node);
      observers.current.set(index, resizeObserver);
    },
    []
  );

  return {
    parentRef,
    totalSize,
    virtualItems,
    measureElement,
  };
}
