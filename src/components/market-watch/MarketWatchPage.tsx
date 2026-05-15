import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, TextField, InputAdornment } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SearchIcon from '@mui/icons-material/Search';
import PageContainer from '../layout/PageContainer';
import { useMarketStore } from '../../stores/marketStore';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { SYMBOL_DIGITS, SYMBOL_NAMES, getActiveSymbols } from '../../constants/symbols';

/** 交易对行（通用） */
const QuoteRow: React.FC<{
  symbol: string;
  bid: number;
  ask: number;
  changePips: number;
  changePercent: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  isFavorite: boolean;
  isCrypto: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}> = ({ symbol, bid, ask, changePips, changePercent, volume24h, high24h, low24h, isFavorite, isCrypto, onToggleFavorite, onClick }) => {
  const digits = SYMBOL_DIGITS[symbol] || 5;
  const isUp = changePips >= 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.2,
        borderBottom: '1px solid',
        borderColor: 'var(--border)',
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:active': { bgcolor: 'var(--bg-tertiary)' },
      }}
    >
      {/* 交易对信息 */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            {symbol}
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            {SYMBOL_NAMES[symbol] || ''}
          </Typography>
        </Box>
        {isCrypto ? (
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10, mt: 0.2 }}>
            Vol {volume24h ? (volume24h > 1000000 ? `${(volume24h / 1000000).toFixed(1)}M` : volume24h > 1000 ? `${(volume24h / 1000).toFixed(1)}K` : volume24h.toFixed(0)) : '--'} USDT
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.2 }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              Bid: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{bid.toFixed(digits)}</span>
            </Typography>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              Ask: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{ask.toFixed(digits)}</span>
            </Typography>
          </Box>
        )}
      </Box>

      {/* 价格和涨跌 */}
      <Box sx={{ textAlign: 'right', mr: 1 }}>
        <Typography className="font-mono" sx={{
          color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
        }}>
          {bid.toFixed(digits)}
        </Typography>
        {isCrypto ? (
          <Typography sx={{
            color: isUp ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: 11, fontWeight: 600,
          }}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </Typography>
        ) : (
          <Typography sx={{
            color: isUp ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: 10,
          }}>
            {isUp ? '▲' : '▼'} {Math.abs(changePips).toFixed(1)} pips
          </Typography>
        )}
      </Box>

      {/* 收藏 */}
      <IconButton onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        size="small" sx={{ color: isFavorite ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
        {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
};

const MarketWatchPage: React.FC = () => {
  const navigate = useNavigate();
  const mode = useTradingModeStore((s) => s.mode);
  const quotes = useMarketStore((s) => s.quotes);
  const favorites = useMarketStore((s) => s.favorites);
  const activeSymbols = useMarketStore((s) => s.activeSymbols);
  const toggleFavorite = useMarketStore((s) => s.toggleFavorite);
  const [search, setSearch] = useState('');

  const isCrypto = mode === 'crypto';

  const filteredSymbols = useMemo(() => {
    const list = activeSymbols.length > 0 ? activeSymbols : getActiveSymbols(mode);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(s => s.toLowerCase().includes(q) || (SYMBOL_NAMES[s] || '').toLowerCase().includes(q));
  }, [activeSymbols, mode, search]);

  const sortedSymbols = useMemo(() => {
    const favs = filteredSymbols.filter(s => favorites.includes(s));
    const others = filteredSymbols.filter(s => !favorites.includes(s));
    return [...favs, ...others];
  }, [filteredSymbols, favorites]);

  const handleRowClick = (symbol: string) => {
    navigate(`/chart?symbol=${symbol}`);
  };

  return (
    <PageContainer>
      <Box sx={{ px: 1, py: 1.5 }}>
        <Typography sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20 }}>
          {isCrypto ? '📊 行情' : '📊 行情看板'}
        </Typography>
        {isCrypto && (
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {activeSymbols.length} 个交易对 · {favorites.length} 自选
          </Typography>
        )}
      </Box>

      {/* 搜索框（Crypto模式） */}
      {isCrypto && (
        <Box sx={{ px: 1, mb: 1 }}>
          <TextField
            fullWidth size="small"
            placeholder="搜索交易对..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--text-secondary)', fontSize: 18 }} /></InputAdornment>,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#1A1D27', color: '#fff', borderRadius: '8px',
                '& fieldset': { borderColor: '#2A2D3A' },
                '&:hover fieldset': { borderColor: '#2196F3' },
                '&.Mui-focused fieldset': { borderColor: '#2196F3' },
              },
            }}
          />
        </Box>
      )}

      {/* 列表 */}
      <Box>
        {sortedSymbols.map((symbol) => {
          const q = quotes[symbol];
          return (
            <QuoteRow
              key={symbol}
              symbol={symbol}
              bid={q?.bid ?? 0}
              ask={q?.ask ?? 0}
              changePips={q?.changePips ?? 0}
              changePercent={q?.changePercent ?? 0}
              volume24h={q?.volume24h}
              high24h={q?.high24h}
              low24h={q?.low24h}
              isFavorite={favorites.includes(symbol)}
              isCrypto={isCrypto}
              onToggleFavorite={() => toggleFavorite(symbol)}
              onClick={() => handleRowClick(symbol)}
            />
          );
        })}
      </Box>

      {sortedSymbols.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            未找到匹配的交易对
          </Typography>
        </Box>
      )}
    </PageContainer>
  );
};

export default MarketWatchPage;
