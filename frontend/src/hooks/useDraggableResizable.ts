import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

interface Size {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

interface UseDraggableResizableOptions {
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  margin: number;
}

interface UseDraggableResizableResult {
  style: CSSProperties;
  onHeaderPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onResizeHandlePointerDown: (e: React.PointerEvent<HTMLElement>) => void;
}

function clampPosition(pos: Position, size: Size): Position {
  const maxX = Math.max(0, window.innerWidth - size.width);
  const maxY = Math.max(0, window.innerHeight - size.height);
  return {
    x: Math.min(Math.max(pos.x, 0), maxX),
    y: Math.min(Math.max(pos.y, 0), maxY),
  };
}

function defaultSize(defaultWidth: number, defaultHeight: number, margin: number): Size {
  return {
    width: Math.min(defaultWidth, window.innerWidth - margin * 2),
    height: Math.min(defaultHeight, window.innerHeight - margin * 2),
  };
}

export function useDraggableResizable({
  defaultWidth,
  defaultHeight,
  minWidth,
  minHeight,
  margin,
}: UseDraggableResizableOptions): UseDraggableResizableResult {
  const [size, setSize] = useState<Size>(() => defaultSize(defaultWidth, defaultHeight, margin));
  const [position, setPosition] = useState<Position>(() => {
    const initialSize = defaultSize(defaultWidth, defaultHeight, margin);
    return {
      x: (window.innerWidth - initialSize.width) / 2,
      y: (window.innerHeight - initialSize.height) / 2,
    };
  });

  const sizeRef = useRef(size);
  const positionRef = useRef(position);
  sizeRef.current = size;
  positionRef.current = position;

  useEffect(() => {
    function handleWindowResize() {
      setSize((prevSize) => {
        const nextSize: Size = {
          width: Math.min(prevSize.width, window.innerWidth - margin),
          height: Math.min(prevSize.height, window.innerHeight - margin),
        };
        setPosition((prevPos) => clampPosition(prevPos, nextSize));
        return nextSize;
      });
    }
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [margin]);

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button')) return;
    e.preventDefault();

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = positionRef.current;
    const dragSize = sizeRef.current;

    e.currentTarget.setPointerCapture(pointerId);

    function handleMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPosition(clampPosition({ x: startPos.x + dx, y: startPos.y + dy }, dragSize));
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }, []);

  const onResizeHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = sizeRef.current;
      const fixedPos = positionRef.current;

      e.currentTarget.setPointerCapture(pointerId);

      function handleMove(ev: PointerEvent) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const maxWidth = window.innerWidth - fixedPos.x - margin;
        const maxHeight = window.innerHeight - fixedPos.y - margin;
        const nextWidth = Math.min(Math.max(startSize.width + dx, minWidth), maxWidth);
        const nextHeight = Math.min(Math.max(startSize.height + dy, minHeight), maxHeight);
        setSize({ width: nextWidth, height: nextHeight });
      }
      function handleUp() {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      }
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    },
    [minWidth, minHeight, margin]
  );

  return {
    style: {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
    },
    onHeaderPointerDown,
    onResizeHandlePointerDown,
  };
}
