import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export default function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  onScroll,
}: VirtualListProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate item heights
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // Calculate total height
  const getTotalHeight = useCallback(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getItemHeight]);

  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    if (!items.length) return { start: 0, end: 0 };

    let accumulatedHeight = 0;
    let start = 0;
    let end = items.length;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const itemH = getItemHeight(i);
      if (accumulatedHeight + itemH > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemH;
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = start; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + height) {
        end = Math.min(items.length, i + overscan);
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }

    return { start, end };
  }, [items.length, scrollTop, height, overscan, getItemHeight]);

  // Calculate offset for visible items
  const getOffsetForIndex = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'number') {
        return index * itemHeight;
      }

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [itemHeight, getItemHeight]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      setIsScrolling(true);

      if (onScroll) {
        onScroll(newScrollTop);
      }

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling to false after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    },
    [onScroll]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const { start, end } = getVisibleRange();
  const totalHeight = getTotalHeight();
  const visibleItems = items.slice(start, end);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = start + index;
          const offset = getOffsetForIndex(actualIndex);
          const itemH = getItemHeight(actualIndex);

          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: offset,
                height: itemH,
                left: 0,
                right: 0,
                willChange: isScrolling ? 'transform' : 'auto',
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoized item wrapper for performance
export const VirtualListItem = React.memo<{
  children: React.ReactNode;
  className?: string;
}>(({ children, className = '' }) => {
  return <div className={`px-4 py-2 ${className}`}>{children}</div>;
});

VirtualListItem.displayName = 'VirtualListItem';
