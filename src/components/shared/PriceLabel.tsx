import React from 'react';

interface PriceLabelProps {
  value: number;
  prefix?: string;
  suffix?: string;
  digits?: number;
  showColor?: boolean;
  showSign?: boolean;
  className?: string;
  variant?: 'price' | 'percent' | 'pips';
}

const PriceLabel: React.FC<PriceLabelProps> = ({
  value,
  prefix = '',
  suffix = '',
  digits = 2,
  showColor = true,
  showSign = false,
  className = '',
  variant = 'price',
}) => {
  const isPositive = value >= 0;
  const isNegative = value < 0;

  let colorClass = '';
  if (showColor) {
    if (isPositive) colorClass = 'text-accent-green';
    if (isNegative) colorClass = 'text-accent-red';
  }

  const signStr = showSign && isPositive ? '+' : '';

  let formattedValue: string;
  if (variant === 'percent') {
    formattedValue = `${signStr}${value.toFixed(digits)}%`;
  } else if (variant === 'pips') {
    formattedValue = `${signStr}${Math.abs(value).toFixed(digits)}`;
  } else {
    formattedValue = `${prefix}${signStr}${value.toFixed(digits)}${suffix}`;
  }

  return (
    <span className={`font-mono ${colorClass} ${className}`}>
      {formattedValue}
    </span>
  );
};

export default PriceLabel;
