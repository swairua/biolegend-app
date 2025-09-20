import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveContainer } from 'recharts';

interface DebouncedResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  debounceMs?: number;
  children: React.ReactNode;
  [key: string]: any;
}

export const DebouncedResponsiveContainer: React.FC<DebouncedResponsiveContainerProps> = ({
  width = "100%",
  height = 300,
  debounceMs = 250, // Increased debounce time to prevent loops
  children,
  ...props
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver>();
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const isObservingRef = useRef(false);

  // Debounced callback to handle resize
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const entry = entries[0];
        if (entry) {
          const { width: newWidth, height: newHeight } = entry.contentRect;

          // Only update if size actually changed significantly (prevents micro-adjustments)
          const threshold = 1;
          const widthChanged = Math.abs(newWidth - lastSizeRef.current.width) > threshold;
          const heightChanged = Math.abs(newHeight - lastSizeRef.current.height) > threshold;

          if (widthChanged || heightChanged) {
            lastSizeRef.current = { width: newWidth, height: newHeight };
            setShouldRender(true);
          }
        }
      } catch (error) {
        // Silently handle any ResizeObserver errors
        console.debug('ResizeObserver error handled:', error);
      }
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (!containerRef.current || isObservingRef.current) return;

    try {
      // Create a more robust resize observer with error handling
      observerRef.current = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to prevent synchronous layout thrashing
        requestAnimationFrame(() => {
          handleResize(entries);
        });
      });

      observerRef.current.observe(containerRef.current);
      isObservingRef.current = true;
    } catch (error) {
      // Fallback to simple timeout-based rendering
      console.debug('ResizeObserver creation failed, using fallback:', error);
      setShouldRender(true);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        isObservingRef.current = false;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleResize]);

  // Initial render with fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height, minHeight: 0, minWidth: 0 }}
      className="relative overflow-hidden"
    >
      {shouldRender && (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={0}
          {...props}
        >
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
};
