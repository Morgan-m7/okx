import React from 'react';
import { Box, Typography, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { SYMBOL_NAMES } from '../../constants/symbols';
import { useMarketStore } from '../../stores/marketStore';
import type { SymbolPair } from '../../types/market';

interface SymbolSelectorProps {
  selected: SymbolPair;
  onChange: (symbol: SymbolPair) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({ selected, onChange }) => {
  const activeSymbols = useMarketStore((s) => s.activeSymbols);
  const symbols: SymbolPair[] = activeSymbols.length > 0 ? activeSymbols : ['EUR/USD', 'GBP/USD', 'USD/JPY'];

  // ★ 如果当前选中值不在可用列表中，自动切换到第一个合法值
  const isValid = symbols.includes(selected);
  React.useEffect(() => {
    if (!isValid && symbols.length > 0) {
      onChange(symbols[0] as SymbolPair);
    }
  }, [isValid, symbols, onChange]);

  const handleChange = (e: SelectChangeEvent) => {
    onChange(e.target.value as SymbolPair);
  };

  return (
    <Select
      value={isValid ? selected : symbols[0] || ''}
      onChange={handleChange}
      size="small"
      sx={{
        bgcolor: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        fontWeight: 600,
        height: 32,
        minWidth: 120,
        '& .MuiSelect-icon': { color: 'var(--text-secondary)' },
        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
      }}
    >
      {symbols.map((symbol) => (
        <MenuItem key={symbol} value={symbol} sx={{ fontSize: 14 }}>
          {symbol} - {SYMBOL_NAMES[symbol] || ''}
        </MenuItem>
      ))}
    </Select>
  );
};

export default SymbolSelector;
