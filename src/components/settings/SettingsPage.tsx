import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Snackbar from '@mui/material/Snackbar';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CableIcon from '@mui/icons-material/Cable';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import ScienceIcon from '@mui/icons-material/Science';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { dataSourceManager } from '../../engine/data-source-manager';
import StrategySettingsPanel from './StrategySettingsPanel';
import type { ConnectionStatus } from '../../types/settings';

const StatusBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const colorMap: Record<ConnectionStatus, 'success' | 'warning' | 'error' | 'default'> = {
    connected: 'success', connecting: 'warning', error: 'error', disconnected: 'default',
  };
  const labelMap: Record<ConnectionStatus, string> = {
    connected: '已连接', connecting: '连接中...', error: '连接失败', disconnected: '未连接',
  };
  return <Chip size="small" color={colorMap[status]} label={labelMap[status]} />;
};

const DATA_SOURCE_TABS = [
  { id: 'justmarkets', label: 'JustMarkets', icon: <CableIcon />, subtitle: '外汇·MT5桥接' },
  { id: 'okx', label: 'OKX', icon: <CurrencyBitcoinIcon />, subtitle: '加密货币·合约交易' },
  { id: 'strategy', label: '策略', icon: <AccountTreeIcon />, subtitle: '自动交易策略' },
] as const;

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, connectOkx, connectViaBridge, disconnect, resetConfig } = useSettingsStore();
  const mode = useTradingModeStore((s) => s.mode);
  const [tabIndex, setTabIndex] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cryptoSnack, setCryptoSnack] = useState(false);

  // ── JustMarkets ──
  const [jmKey, setJmKey] = useState('');
  const [jmServer, setJmServer] = useState('');

  // ── OKX ──
  const [okxKey, setOkxKey] = useState(config.okx.apiKey);
  const [okxSecret, setOkxSecret] = useState(config.okx.secretKey);
  const [okxPass, setOkxPass] = useState(config.okx.passphrase);

  const isConnected = config.status === 'connected';
  const currentSource = config.dataSource;

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setTestResult(null);

    try {
      let result;
      const tab = DATA_SOURCE_TABS[tabIndex];

      switch (tab.id) {
        case 'justmarkets':
          if (!jmServer.trim()) {
            setTestResult({ success: false, message: '请填写桥接服务器地址' });
            setConnecting(false);
            return;
          }
          result = await connectViaBridge(jmKey.trim(), jmServer.trim());
          break;
        case 'okx':
          if (!okxKey.trim() || !okxSecret.trim() || !okxPass.trim()) {
            setTestResult({ success: false, message: '请填写完整的 OKX 配置' });
            setConnecting(false);
            return;
          }
          result = await connectOkx(okxKey.trim(), okxSecret.trim(), okxPass.trim(), 'demo');
          break;
        default:
          return;
      }

      setTestResult({
        success: result.success,
        message: result.success
          ? `✅ 连接成功！延迟 ${result.latencyMs}ms${result.accountInfo ? ` | 余额: $${result.accountInfo.balance?.toLocaleString()}` : ''}`
          : `❌ ${result.error || '连接失败'}`,
      });

      // 连接成功后强制同步余额到 tradingStore
      if (result.success && result.accountInfo) {
        const { okxConnector } = await import('../../engine/okx-connector');
        const { balance, currency } = okxConnector.getLastBalance();
        if (balance > 0) {
          const { useTradingStore } = await import('../../stores/tradingStore');
          useTradingStore.getState().updateAccount({ balance, currency: currency as any });
          console.log('[Settings] 强制同步余额:', balance, currency);
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `❌ ${err?.message || '未知错误'}` });
    } finally {
      setConnecting(false);
    }
  }, [tabIndex, jmKey, jmServer, okxKey, okxSecret, okxPass, connectOkx, connectViaBridge]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setTestResult({ success: true, message: '已断开连接，切换回模拟数据源' });
  }, [disconnect]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0D0E12' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            ⚙️ 设置
            <StatusBadge status={config.status} />
          </Typography>
          <Chip
            icon={mode === 'crypto' ? <CurrencyBitcoinIcon /> : <ShowChartIcon />}
            label={mode === 'crypto' ? '加密货币模式' : '外汇模式'}
            size="small"
            sx={{
              bgcolor: mode === 'crypto' ? 'rgba(255,214,0,0.15)' : 'rgba(33,150,243,0.12)',
              color: mode === 'crypto' ? 'var(--accent-yellow)' : 'var(--accent-blue)',
              fontWeight: 600, fontSize: 11, height: 22,
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: '#8B8D97', mt: 0.5, display: 'block' }}>
          选择数据源，自动切换交易模式和界面
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', mt: 0.2, display: 'block', fontSize: 10 }}>
          OKX → 加密货币合约交易界面 | 其他 → 外汇交易界面
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#2A2D3A' }} />

      <Tabs
        value={tabIndex}
        onChange={(_, v) => { setTabIndex(v); setTestResult(null); }}
        variant="fullWidth"
        sx={{
          bgcolor: '#16181E',
          borderBottom: '1px solid #2A2D3A',
          minHeight: 56,
          '& .MuiTab-root': { color: '#8B8D97', minHeight: 56, py: 0.5, fontSize: 12, '&.Mui-selected': { color: '#2196F3' } },
          '& .MuiTabs-indicator': { bgcolor: '#2196F3' },
        }}
      >
        {DATA_SOURCE_TABS.map(tab => (
          <Tab key={tab.id} icon={tab.icon}
            label={<><b>{tab.label}</b><br /><span style={{ fontSize: 10, opacity: 0.7 }}>{tab.subtitle}</span></>}
            sx={{ textTransform: 'none' }} />
        ))}
      </Tabs>

      <Box sx={{ px: 2, py: 1.5, flex: 1, overflow: 'auto' }}>
        {/* 当前数据源指示器 */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip icon={<ScienceIcon />} label="模拟数据" size="small"
            variant={currentSource === 'simulated' ? 'filled' : 'outlined'}
            color={currentSource === 'simulated' ? 'primary' : 'default'}
            sx={{ opacity: currentSource === 'simulated' ? 1 : 0.5 }} />
          {DATA_SOURCE_TABS.map(tab => (
            <Chip key={tab.id} icon={tab.icon} label={tab.label} size="small"
              variant={currentSource === tab.id ? 'filled' : 'outlined'}
              color={currentSource === tab.id ? 'success' : 'default'}
              sx={{ opacity: currentSource === tab.id ? 1 : 0.5 }} />
          ))}
        </Box>

        {/* JustMarkets */}
        {tabIndex === 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 700 }}>🔌 JustMarkets — MT5 桥接</Typography>
              <Chip label="外汇模式" size="small" color="info" sx={{ height: 20, fontSize: 10 }} />
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#1B3D1B', borderRadius: 2, mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#A5D6A7', lineHeight: 1.8, display: 'block' }}>
                ✅ 开源 mt5-bridge，运行在MT5终端内，通过 REST API 提供外汇行情
              </Typography>
            </Box>
            <TextField fullWidth size="small" label="API Key（可选）" placeholder="留空"
              value={jmKey} onChange={e => setJmKey(e.target.value)} disabled={isConnected}
              sx={textFieldSx} type="password" />
            <TextField fullWidth size="small" label="桥接地址" placeholder="默认: http://localhost:8891"
              value={jmServer} onChange={e => setJmServer(e.target.value)} disabled={isConnected}
              sx={{ ...textFieldSx, mb: 2 }} />
            <ConnectButton label="MT5 桥接" isConnected={isConnected}
              connecting={connecting} onConnect={handleConnect} onDisconnect={handleDisconnect} />
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#1A1D27', borderRadius: 2, fontSize: 12, color: '#8B8D97', lineHeight: 1.8 }}>
              安装 mt5-bridge → 拖到MT5图表 → 启动 → 填入 http://你的IP:8891 → 一键连接
            </Box>
          </Box>
        )}

        {/* OKX */}
        {tabIndex === 1 && (
          <Box>
            <Typography variant="body2" sx={{ color: '#FFD600', fontWeight: 600, mb: 0.5 }}>
              ₿ OKX — 加密货币永续合约交易
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#1B3D1B', borderRadius: 2, mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#A5D6A7', lineHeight: 1.8, display: 'block' }}>
                ✅ 连接后自动切换为加密货币模式<br />
                ✅ 支持 30+ 交易对 · 永续合约 · 杠杆 1x-125x
              </Typography>
            </Box>
            <Chip icon={<CurrencyBitcoinIcon />} label="连接后界面自动切换为交易所风格" size="small"
              sx={{ mb: 1.5, bgcolor: 'rgba(255,214,0,0.1)', color: '#FFD600', fontSize: 11 }} />
            <TextField fullWidth size="small" label="API Key" placeholder="输入 OKX API Key"
              value={okxKey} onChange={e => setOkxKey(e.target.value)} disabled={isConnected}
              sx={textFieldSx} type="password" />
            <TextField fullWidth size="small" label="Secret Key" placeholder="输入 Secret Key"
              value={okxSecret} onChange={e => setOkxSecret(e.target.value)} disabled={isConnected}
              sx={textFieldSx} type="password" />
            <TextField fullWidth size="small" label="Passphrase" placeholder="输入 API Passphrase"
              value={okxPass} onChange={e => setOkxPass(e.target.value)} disabled={isConnected}
              sx={{ ...textFieldSx, mb: 2 }} type="password" />
            <ConnectButton label="OKX 演示环境" isConnected={isConnected}
              connecting={connecting} onConnect={handleConnect} onDisconnect={handleDisconnect} />
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#1A1D27', borderRadius: 2, fontSize: 12, color: '#8B8D97', lineHeight: 1.8 }}>
              登录 OKX → API → V5 API Key → 读取+交易权限 → 复制填入
            </Box>
          </Box>
        )}

        {/* 连接结果 */}
        <Collapse in={testResult !== null} sx={{ mt: 1.5 }}>
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'}
              sx={{
                bgcolor: testResult.success ? '#1B3D1B' : '#3D1B1B',
                color: testResult.success ? '#00C853' : '#FF1744',
                borderRadius: 2,
                '& .MuiAlert-icon': { color: testResult.success ? '#00C853' : '#FF1744' },
              }}>
              <AlertTitle sx={{ color: testResult.success ? '#00C853' : '#FF1744', fontSize: 13, mb: 0.5 }}>
                {testResult.success ? '✅ 连接成功' : '❌ 连接失败'}
              </AlertTitle>
              <Typography variant="caption" sx={{ color: testResult.success ? '#A5D6A7' : '#EF9A9A', whiteSpace: 'pre-wrap' }}>
                {testResult.message}
              </Typography>
            </Alert>
          )}
        </Collapse>

        {isConnected && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#1B3D1B', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#A5D6A7', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              已连接，数据来自 {DATA_SOURCE_TABS[tabIndex].label}
              {tabIndex === 1 && ' — 已切换至加密货币合约模式'}
            </Typography>
          </Box>
        )}

        {/* 策略 */}
        {tabIndex === 2 && (
          <Box sx={{ mt: 1 }}>
            <StrategySettingsPanel />
          </Box>
        )}

        <Divider sx={{ borderColor: '#2A2D3A', my: 2 }} />
        <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            onClick={() => {
              dataSourceManager.switchToCryptoSimulated();
              setCryptoSnack(true);
              setTimeout(() => navigate('/trading'), 600);
            }}
            startIcon={<CurrencyBitcoinIcon />}
            variant="outlined"
            sx={{
              color: '#FFD600', borderColor: '#FFD600',
              fontSize: 12, textTransform: 'none', py: 1,
              '&:hover': { borderColor: '#FFD600', bgcolor: 'rgba(255,214,0,0.12)' },
            }}
          >
            ₿ 加密货币模拟模式（$100,000 虚拟USDT）
          </Button>
          <Button size="small" onClick={resetConfig} sx={{ color: '#8B8D97', fontSize: 11, textTransform: 'none' }}>
            重置所有设置
          </Button>
        </Box>
      </Box>

      {/* 加密货币模式切换成功提示 */}
      <Snackbar open={cryptoSnack} autoHideDuration={3000}
        onClose={() => setCryptoSnack(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" sx={{
          bgcolor: '#1B3D1B', color: '#00C853', borderRadius: 2,
          '& .MuiAlert-icon': { color: '#00C853' },
        }}>
          ✅ 已切换到加密货币模拟模式 · 余额 $100,000 USDT
        </Alert>
      </Snackbar>
    </Box>
  );
};

const textFieldSx = {
  mb: 1.5,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#1A1D27', color: '#fff',
    '& fieldset': { borderColor: '#2A2D3A' },
    '&:hover fieldset': { borderColor: '#2196F3' },
    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
  },
  '& .MuiInputLabel-root': { color: '#8B8D97' },
};

const ConnectButton: React.FC<{
  label: string; isConnected: boolean; connecting: boolean;
  onConnect: () => void; onDisconnect: () => void;
}> = ({ label, isConnected, connecting, onConnect, onDisconnect }) => {
  if (isConnected) {
    return (
      <Button fullWidth variant="outlined" startIcon={<LinkOffIcon />}
        onClick={onDisconnect} color="error" sx={{ py: 1.2, fontWeight: 600 }}>
        断开连接，切换回模拟数据
      </Button>
    );
  }
  return (
    <Button fullWidth variant="contained"
      startIcon={connecting ? <CircularProgress size={18} color="inherit" /> : <LinkIcon />}
      onClick={onConnect} disabled={connecting}
      sx={{
        bgcolor: '#00C853', color: '#000', fontWeight: 700, py: 1.2,
        '&:hover': { bgcolor: '#00E676' },
        '&.Mui-disabled': { bgcolor: '#2A2D3A', color: '#666' },
      }}>
      {connecting ? '正在连接...' : `🚀 一键连接 ${label}`}
    </Button>
  );
};

export default SettingsPage;
