import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import type { EquityPoint } from '../../types/backtest';

interface EquityCurveChartProps {
  equityCurve: EquityPoint[];
}

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ equityCurve }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || equityCurve.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, bottom: 24, left: 60, right: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = equityCurve.map(p => p.equity);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    ctx.fillStyle = '#0D0E12';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1E2029';
    ctx.lineWidth = 0.5;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    const firstEq = equityCurve[0].equity;
    const lastEq = equityCurve[equityCurve.length - 1].equity;
    const isPositive = lastEq >= firstEq;
    gradient.addColorStop(0, isPositive ? 'rgba(0,200,83,0.3)' : 'rgba(255,23,68,0.3)');
    gradient.addColorStop(1, isPositive ? 'rgba(0,200,83,0.02)' : 'rgba(255,23,68,0.02)');

    ctx.beginPath();
    equityCurve.forEach((point, i) => {
      const x = padding.left + (i / (equityCurve.length - 1)) * chartWidth;
      const y = padding.top + ((maxVal - point.equity) / valRange) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    const lineColor = isPositive ? '#00C853' : '#FF1744';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    equityCurve.forEach((point, i) => {
      const x = padding.left + (i / (equityCurve.length - 1)) * chartWidth;
      const y = padding.top + ((maxVal - point.equity) / valRange) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#8B8D97';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const val = maxVal - (valRange / gridLines) * i;
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(`$${val.toFixed(0)}`, padding.left - 4, y + 3);
    }
  }, [equityCurve]);

  if (equityCurve.length === 0) return null;

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1, fontSize: 14 }}>
        资金曲线
      </Typography>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 200, borderRadius: '6px' }}
      />
    </Box>
  );
};

export default EquityCurveChart;
