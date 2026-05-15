import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { ChartRenderer } from '../../canvas/chart-renderer';
import type { Candle, IndicatorConfig } from '../../types';

interface ChartCanvasProps {
  candles: Candle[];
  visibleRange: { startIndex: number; endIndex: number };
  indicators: IndicatorConfig[];
  onReady: (renderer: ChartRenderer) => void;
  onGesture: (type: string, data: any) => void;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  candles,
  visibleRange,
  indicators,
  onReady,
  onGesture,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChartRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const renderer = new ChartRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(Math.floor(width), Math.floor(height));
        renderer.render();
      }
    });

    resizeObserver.observe(containerRef.current);
    onReady(renderer);

    return () => {
      resizeObserver.disconnect();
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setCandles(candles);
      rendererRef.current.setVisibleRange(visibleRange.startIndex, visibleRange.endIndex);
      rendererRef.current.setIndicators(indicators);
      rendererRef.current.render();
    }
  }, [candles, visibleRange, indicators]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && rendererRef.current) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const candle = rendererRef.current.getCandleAt(x);
        rendererRef.current.getCrosshairLayer()?.show(x, y, candle);
        rendererRef.current.render();
        onGesture('crosshair', { x, y, candle });
      }
    }
  }, [onGesture]);

  const handleTouchEnd = useCallback(() => {
    if (rendererRef.current) {
      setTimeout(() => {
        rendererRef.current?.getCrosshairLayer()?.hide();
        rendererRef.current?.render();
      }, 2000);
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: 'var(--bg-primary)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
};

export default ChartCanvas;
