import { useRef, useCallback } from 'react';
import { GestureHandler } from '../canvas/gesture-handler';

export function useChartGestures(
  onZoomIn: () => void,
  onZoomOut: () => void,
  onPan: (dx: number) => void,
  onCrosshair: (x: number, y: number) => void,
  onDoubleTapReset: () => void
) {
  const gestureRef = useRef<GestureHandler | null>(null);

  const initGesture = useCallback((canvas: HTMLCanvasElement) => {
    if (gestureRef.current) {
      gestureRef.current.destroy();
    }

    const handler = new GestureHandler();
    gestureRef.current = handler;

    const el = canvas;

    const onTouchStart = (e: TouchEvent) => {
      handler.handleTouchStart(e.touches);
    };
    const onTouchMove = (e: TouchEvent) => {
      handler.handleTouchMove(e.touches);
    };
    const onTouchEnd = (e: TouchEvent) => {
      handler.handleTouchEnd(e.touches);
    };

    handler.onPinchMove = (_, __, ___, scale) => {
      if (scale > 1) onZoomIn();
      else onZoomOut();
    };

    handler.onPanMove = (dx) => {
      onPan(dx);
    };

    handler.onDoubleTap = () => {
      onDoubleTapReset();
    };

    handler.onLongPress = (x, y) => {
      onCrosshair(x, y);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      handler.destroy();
    };
  }, [onZoomIn, onZoomOut, onPan, onCrosshair, onDoubleTapReset]);

  return { initGesture };
}
