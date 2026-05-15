import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useMarketStore } from '../../stores/marketStore';
import { SYMBOL_NAMES } from '../../constants/symbols';
import type { SymbolPair } from '../../types/market';

const FavoriteManager: React.FC = () => {
  const favorites = useMarketStore((s) => s.favorites);
  const toggleFavorite = useMarketStore((s) => s.toggleFavorite);
  const activeSymbols = useMarketStore((s) => s.activeSymbols);
  const displaySymbols = activeSymbols.length > 0 ? activeSymbols : ['EUR/USD', 'GBP/USD'];

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11, mb: 1 }}>
        自选列表 ({favorites.length}/{displaySymbols.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {displaySymbols.map((symbol) => {
          const isFav = favorites.includes(symbol);
          return (
            <Chip
              key={symbol}
              icon={isFav ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              label={symbol}
              size="small"
              onClick={() => toggleFavorite(symbol)}
              sx={{
                bgcolor: isFav ? 'rgba(255,214,0,0.15)' : 'var(--bg-tertiary)',
                color: isFav ? 'var(--accent-yellow)' : 'var(--text-secondary)',
                fontWeight: isFav ? 600 : 400,
                fontSize: 11,
                '& .MuiChip-icon': { color: isFav ? 'var(--accent-yellow)' : 'var(--text-secondary)' },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default FavoriteManager;
