import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, Button, Slider, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Collapse, IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Select, MenuItem } from '@mui/material';
import { useStrategyStore } from '../../stores/strategyStore';
import { useStrategyRunner } from '../../hooks/useStrategyRunner';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { getDefaultSymbol } from '../../constants/symbols';
import type { StrategyId, StrategyFamily, StrategyConfig } from '../../types/strategy';

interface StrategyDef {
  id: StrategyId;
  family: StrategyFamily;
  name: string;
  desc: string;
  detail: string;
  recommend: string; // 推荐周期说明
  defaultParams: Record<string, any>;
}

const ALL_STRATEGIES: StrategyDef[] = [
  {
    id: 'ma-cross', family: 'trend-following', name: 'MA交叉',
    desc: '快慢均线金叉/死叉开仓',
    detail: '当短期均线上穿长期均线时（金叉）开多，下穿时（死叉）开空。是最经典的趋势跟踪策略，适合有明确趋势的行情。参数 fastPeriod=短周期, slowPeriod=长周期。',
    recommend: 'H1（1小时）效果最佳，趋势信号稳定；M15以下噪音多，易假突破',
    defaultParams: { fastPeriod: 10, slowPeriod: 30 },
  },
  {
    id: 'macd', family: 'trend-following', name: 'MACD',
    desc: 'MACD指标金叉/死叉信号',
    detail: '当MACD快线上穿慢线（金叉）时买入，下穿（死叉）时卖出。含Signal线过滤假信号，适合中线趋势交易。参数 fast=快线EMA, slow=慢线EMA, signal=信号线。',
    recommend: 'H1-H4（1-4小时），MACD在中长周期上信号更可靠',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
  },
  {
    id: 'turtle', family: 'trend-following', name: '海龟策略',
    desc: '唐奇安通道突破 + ATR动态止损',
    detail: '基于海龟交易法则：价格突破N日高点开多，跌破N日低点开空。止盈止损基于ATR（平均真实波幅）动态计算，跟随趋势加仓。参数 period=突破周期, atrMultiplier=ATR倍数。',
    recommend: 'H4-D1（4小时~天），海龟策略是长线趋势策略，周期越大效果越好',
    defaultParams: { period: 20, atrMultiplier: 2 },
  },
  {
    id: 'rsi', family: 'mean-reversion', name: 'RSI反转',
    desc: 'RSI超买超卖反向开仓',
    detail: '当RSI进入超卖区（<30）时开多，进入超买区（>70）时开空。价格超跌/超涨后大概率回归均值，适合震荡行情。参数 period=RSI计算周期, overbought=超买阈值, oversold=超卖阈值。',
    recommend: 'M15-H1（15分钟~1小时），震荡行情中效果最好；大周期RSI钝化严重',
    defaultParams: { period: 14, overbought: 70, oversold: 30 },
  },
  {
    id: 'bollinger-reversal', family: 'mean-reversion', name: '布林带反转',
    desc: '价格触及布林带上/下轨反向开仓',
    detail: '当价格触及布林带上轨时开空、触及下轨时开多，需要连续N根K线确认信号。价格极端偏离中轨后大概率回归。参数 period=布林周期, stdDev=标准差倍数, confirmationCandles=确认K线数。',
    recommend: 'M30-H1（30分钟~1小时），需要足够K线形成布林通道',
    defaultParams: { period: 20, stdDev: 2, confirmationCandles: 2 },
  },
  {
    id: 'classic-martingale', family: 'martingale', name: '经典马丁格尔',
    desc: '亏损后按倍数加仓，一回本即全部平仓',
    detail: '每亏损一次，下一单手数乘以上涨倍数（如2x）。只要有一次盈利就能覆盖前面所有亏损并获利。高风险策略，需配合ADX过滤趋势行情使用。参数 baseVolume=起始手数, multiplier=加仓倍数, maxLayers=最大层数, takeProfitPips=止盈点数。',
    recommend: 'M5-M15（5~15分钟），周期太小滑点风险大，周期太大持仓时间过长',
    defaultParams: { baseVolume: 0.01, multiplier: 2, maxLayers: 5, takeProfitPips: 50 },
  },
  {
    id: 'grid', family: 'martingale', name: '网格交易',
    desc: '在价格区间内自动网格开仓/平仓',
    detail: '设定价格区间和网格层数，价格每穿过一层自动开仓，反弹回上一层自动平仓。适合震荡行情自动化收割。参数 gridCount=网格层数, rangePercent=区间范围%, volumePerGrid=每层手数。',
    recommend: 'M15-H1（15分钟~1小时），网格适合中等周期震荡行情',
    defaultParams: { gridCount: 10, rangePercent: 2, volumePerGrid: 0.01 },
  },
];

const FAMILY_LABELS: Record<string, string> = {
  'trend-following': '趋势跟踪',
  'mean-reversion': '均值回归',
  'martingale': '马丁格尔',
};

const FAMILY_COLORS: Record<string, string> = {
  'trend-following': '#2196F3',
  'mean-reversion': '#9C27B0',
  'martingale': '#FFD600',
};

const StrategySettingsPanel: React.FC = () => {
  const strategies = useStrategyStore((s) => s.strategies);
  const updateStrategy = useStrategyStore((s) => s.updateStrategy);
  const { createStrategy, toggleActive, deleteStrategy } = useStrategyRunner();
  const [configTarget, setConfigTarget] = useState<StrategyConfig | null>(null);

  // 只在首次加载且持久化尚未完成时创建默认策略
  useEffect(() => {
    // 如果已经有策略了（持久化已加载），不重复创建
    const hasAny = ALL_STRATEGIES.some(def =>
      strategies.some(s => s.strategyId === def.id)
    );
    if (hasAny) return;

    // 延迟等持久化完全恢复，如果恢复后还是没有策略才创建初始策略
    const timer = setTimeout(() => {
      const stillEmpty = !ALL_STRATEGIES.some(def =>
        useStrategyStore.getState().strategies.some((s: any) => s.strategyId === def.id)
      );
      if (stillEmpty) {
        ALL_STRATEGIES.forEach(def => {
          createStrategy(def.id, def.family, def.name, { ...def.defaultParams });
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 按族分组
  const grouped = ALL_STRATEGIES.map(def => ({
    def,
    config: strategies.find(s => s.strategyId === def.id),
  }));

  const families = ['trend-following', 'mean-reversion', 'martingale'] as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AccountTreeIcon sx={{ color: '#2196F3' }} />
        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
          策略配置
        </Typography>
        <Chip label={`${strategies.filter(s => s.isActive).length} 个运行中`}
          size="small"
          sx={{ bgcolor: 'rgba(0,200,83,0.15)', color: '#00C853', fontWeight: 600, fontSize: 10 }} />
      </Box>

      {families.map(family => {
        const items = grouped.filter(g => g.def.family === family);
        if (items.length === 0) return null;
        return (
          <Box key={family} sx={{ mb: 2, p: 1.5, bgcolor: '#1A1D27', borderRadius: '10px', borderLeft: `3px solid ${FAMILY_COLORS[family]}` }}>
            <Typography sx={{ color: FAMILY_COLORS[family], fontWeight: 600, fontSize: 12, mb: 1 }}>
              {FAMILY_LABELS[family]} ({items.length})
            </Typography>
            {items.map(({ def, config }) => (
              <Box key={def.id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 0.8, borderBottom: '1px solid #2A2D3A',
                '&:last-child': { borderBottom: 'none' },
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    {def.name}
                  </Typography>
                  <Typography sx={{ color: '#8B8D97', fontSize: 10, lineHeight: 1.4 }}>
                    {def.detail}
                  </Typography>
                  {/* 时间周期选择 */}
                  {config && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <ScheduleIcon sx={{ color: '#555', fontSize: 11 }} />
                      <Select
                        value={config.timeframe || 'M15'}
                        size="small"
                        onChange={(e) => {
                          const tf = e.target.value;
                          updateStrategy(config.id, { timeframe: tf as any });
                        }}
                        sx={{
                          bgcolor: '#0D0E12', color: '#8B8D97', fontSize: 10, height: 20,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2A2D3A', borderWidth: '1px' },
                          '& .MuiSvgIcon-root': { color: '#555', fontSize: 14, right: 2 },
                        }}
                      >
                        {['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'].map(tf => (
                          <MenuItem key={tf} value={tf} sx={{ fontSize: 11 }}>{tf}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                  )}
                  {/* 推荐周期 */}
                  <Typography sx={{ color: '#FFD600', fontSize: 9, mt: 0.3, lineHeight: 1.3 }}>
                    💡 推荐: {def.recommend}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {config && (
                    <IconButton size="small" onClick={() => setConfigTarget(config)}
                      sx={{ color: '#8B8D97' }}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Switch
                    checked={config?.isActive ?? false}
                    onChange={() => config && toggleActive(config.id)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#00C853' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00C853' },
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        );
      })}

      {/* 配置弹窗 */}
      <ConfigDialog config={configTarget} onClose={() => setConfigTarget(null)} />
    </Box>
  );
};

/** 策略参数配置弹窗 */
const ConfigDialog: React.FC<{ config: StrategyConfig | null; onClose: () => void }> = ({ config, onClose }) => {
  const updateStrategy = useStrategyStore((s) => s.updateStrategy);
  if (!config) return null;

  const paramEntries = Object.entries(config.params || {}).filter(([_, v]) => typeof v === 'number');

  const handleParamChange = (key: string, value: number) => {
    updateStrategy(config.id, { params: { ...config.params, [key]: value } });
  };

  return (
    <Dialog open={!!config} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: '#16181E', borderRadius: 3 } }}>
      <DialogTitle sx={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
        {config.name} — 参数配置
      </DialogTitle>
      <DialogContent>
        {/* 策略说明 */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#0D0E12', borderRadius: 2 }}>
          <Typography sx={{ color: '#8B8D97', fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {ALL_STRATEGIES.find(s => s.id === config.strategyId)?.detail || ''}
          </Typography>
        </Box>

        {paramEntries.length === 0 && (
          <Typography sx={{ color: '#8B8D97', fontSize: 12, textAlign: 'center', py: 2 }}>
            该策略无可调参数
          </Typography>
        )}
        {paramEntries.map(([key, val]) => (
          <Box key={key} sx={{ mb: 1.5 }}>
            <Typography sx={{ color: '#8B8D97', fontSize: 11, mb: 0.3 }}>{key}: {val}</Typography>
            <Slider value={val} min={1} max={100} step={1}
              onChange={(_, v) => handleParamChange(key, v as number)}
              size="small"
              sx={{ color: '#2196F3', '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} sx={{ color: '#8B8D97' }}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StrategySettingsPanel;
