import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DataSourceType,
  ConnectionStatus,
  OandaConfig,
  OkxConfig,
  ExnessConfig,
  CustomApiConfig,
  ApiConnectionConfig,
  ConnectionTestResult,
} from '../types/settings';
import { useTradingStore } from './tradingStore';

interface SettingsState {
  /** API 连接配置 */
  config: ApiConnectionConfig;

  /** 设置操作 */
  setDataSource: (source: DataSourceType) => void;
  setOandaConfig: (config: Partial<OandaConfig>) => void;
  setOkxConfig: (config: Partial<OkxConfig>) => void;
  setExnessConfig: (config: Partial<ExnessConfig>) => void;
  setCustomApiConfig: (config: Partial<CustomApiConfig>) => void;
  setConnectionStatus: (status: ConnectionStatus, errorMessage?: string | null) => void;

  /** 连接方法 */
  connectOanda: (apiKey: string, accountId: string, env: 'practice' | 'live') => Promise<ConnectionTestResult>;
  connectOkx: (apiKey: string, secretKey: string, passphrase: string, env: 'demo' | 'live') => Promise<ConnectionTestResult>;
  connectExness: (apiKey: string, accountId: string, serverUrl: string, env: 'demo' | 'live') => Promise<ConnectionTestResult>;
  connectViaBridge: (apiKey: string, serverUrl: string) => Promise<ConnectionTestResult>;
  connectITick: (token: string) => Promise<ConnectionTestResult>;

  /** 断开连接 */
  disconnect: () => Promise<void>;

  /** 重置所有配置 */
  resetConfig: () => void;
}

const defaultConfig: ApiConnectionConfig = {
  dataSource: 'simulated',
  oanda: { apiKey: '', accountId: '', environment: 'practice' },
  okx: { apiKey: '', secretKey: '', passphrase: '', environment: 'demo', leverage: 10, marginMode: 'cross' },
  exness: { apiKey: '', accountId: '', serverUrl: '', environment: 'demo' },
  custom: { name: '自定义数据源', baseUrl: '', apiKey: '', wsUrl: '' },
  status: 'disconnected',
  lastConnected: null,
  errorMessage: null,
};

// 模拟连接延迟
const simulateDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      config: { ...defaultConfig },

      setDataSource: (source) => {
        set((state) => ({ config: { ...state.config, dataSource: source } }));
      },

      setOandaConfig: (partial) => {
        set((state) => ({ config: { ...state.config, oanda: { ...state.config.oanda, ...partial } } }));
      },

      setOkxConfig: (partial) => {
        set((state) => ({ config: { ...state.config, okx: { ...state.config.okx, ...partial } } }));
      },

      setExnessConfig: (partial) => {
        set((state) => ({ config: { ...state.config, exness: { ...state.config.exness, ...partial } } }));
      },

      setCustomApiConfig: (partial) => {
        set((state) => ({ config: { ...state.config, custom: { ...state.config.custom, ...partial } } }));
      },

      setConnectionStatus: (status, errorMessage = null) => {
        set((state) => ({
          config: {
            ...state.config,
            status,
            ...(status === 'connected' ? { lastConnected: Date.now() } : {}),
            ...(errorMessage !== undefined ? { errorMessage } : {}),
          },
        }));
      },

      connectOanda: async (apiKey, accountId, environment) => {
        const { setConnectionStatus } = get();
        setConnectionStatus('connecting');

        try {
          // 使用真实的 OANDA 连接器
          const { oandaConnector } = await import('../engine/api-connector');
          const result = await oandaConnector.connect({ apiKey, accountId, environment });

          if (result.success) {
            set((state) => ({
              config: {
                ...state.config,
                dataSource: 'oanda',
                oanda: { ...state.config.oanda, apiKey, accountId, environment },
                status: 'connected',
                lastConnected: Date.now(),
                errorMessage: null,
              },
            }));
          } else {
            setConnectionStatus('error', result.error || '连接失败');
          }

          return result;
        } catch (err: any) {
          const msg = err?.message || '连接失败，请检查网络和 API 配置';
          setConnectionStatus('error', msg);
          return { success: false, error: msg };
        }
      },

      connectOkx: async (apiKey, secretKey, passphrase, environment) => {
        const { setConnectionStatus } = get();
        setConnectionStatus('connecting');

        try {
          if (!apiKey || !secretKey || !passphrase) {
            throw new Error('请填写完整的 OKX API 配置');
          }

          // 使用真实的 OKX 连接器连接并获取余额
          const { okxConnector } = await import('../engine/okx-connector');
          const result = await okxConnector.connect({
            apiKey,
            secretKey,
            passphrase,
            environment,
            leverage: get().config.okx.leverage || 10,
            marginMode: get().config.okx.marginMode || 'cross',
          });

          if (result.success) {
            // 直接写入真实余额到 tradingStore（不等 dataSourceManager 二次调用）
            const realBalance = result.accountInfo?.balance ?? 0;
            useTradingStore.getState().setAccount({
              name: 'OKX 实盘',
              type: 'live',
              broker: 'OKX',
              balance: realBalance,
              equity: realBalance,
              marginUsed: 0,
              marginFree: realBalance,
              marginLevel: 0,
              leverage: result.accountInfo?.leverage || 10,
              currency: result.accountInfo?.currency || 'USDT',
              unrealizedPnl: 0,
              realizedPnl: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });

            set((state) => ({
              config: {
                ...state.config,
                dataSource: 'okx',
                okx: { ...state.config.okx, apiKey, secretKey, passphrase, environment },
                status: 'connected',
                lastConnected: Date.now(),
                errorMessage: null,
              },
            }));
          } else {
            setConnectionStatus('error', result.error || '连接失败');
          }

          return result;
        } catch (err: any) {
          const msg = err?.message || '连接失败';
          setConnectionStatus('error', msg);
          return { success: false, error: msg };
        }
      },

      connectExness: async (apiKey, accountId, serverUrl, environment) => {
        const { setConnectionStatus } = get();
        setConnectionStatus('connecting');

        try {
          if (!apiKey || !serverUrl) {
            throw new Error('请填写 API Key 和服务器地址');
          }

          // 使用 Exness 连接器获取真实余额
          const { exnessConnector } = await import('../engine/exness-connector');
          const result = await exnessConnector.connect({ apiKey, accountId, serverUrl, environment });

          if (result.success) {
            set((state) => ({
              config: {
                ...state.config,
                dataSource: 'exness',
                exness: { ...state.config.exness, apiKey, accountId, serverUrl, environment },
                status: 'connected',
                lastConnected: Date.now(),
                errorMessage: null,
              },
            }));
          } else {
            setConnectionStatus('error', result.error || '连接失败');
          }

          return result;
        } catch (err: any) {
          const msg = err?.message || '连接失败';
          setConnectionStatus('error', msg);
          return { success: false, error: msg };
        }
      },

      connectViaBridge: async (apiKey, serverUrl) => {
        const { setConnectionStatus } = get();
        setConnectionStatus('connecting');

        try {
          if (!apiKey || !serverUrl) {
            throw new Error('请填写 API Key 和桥接服务器地址');
          }

          // 使用 MT5 桥接连接器
          const { mt5Bridge } = await import('../engine/mt5-bridge-connector');
          const result = await mt5Bridge.connect({ name: 'MT5 Bridge', baseUrl: serverUrl, apiKey, serverUrl });

          if (result.success) {
            set((state) => ({
              config: {
                ...state.config,
                dataSource: 'custom',
                custom: { ...state.config.custom, apiKey, baseUrl: serverUrl, serverUrl },
                status: 'connected',
                lastConnected: Date.now(),
                errorMessage: null,
              },
            }));
          } else {
            setConnectionStatus('error', result.error || '连接失败');
          }

          return result;
        } catch (err: any) {
          const msg = err?.message || '连接失败';
          setConnectionStatus('error', msg);
          return { success: false, error: msg };
        }
      },

      connectITick: async (token) => {
        const { setConnectionStatus } = get();
        setConnectionStatus('connecting');

        try {
          if (!token) throw new Error('请填写 iTick API Token');

          const { itickConnector } = await import('../engine/itick-connector');
          const result = await itickConnector.connect({ apiKey: token });

          if (result.success) {
            set((state) => ({
              config: {
                ...state.config,
                dataSource: 'custom',
                status: 'connected',
                lastConnected: Date.now(),
                errorMessage: null,
              },
            }));
          } else {
            setConnectionStatus('error', result.error || '连接失败');
          }

          return result;
        } catch (err: any) {
          const msg = err?.message || '连接失败';
          setConnectionStatus('error', msg);
          return { success: false, error: msg };
        }
      },

      disconnect: async () => {
        set((state) => ({
          config: {
            ...state.config,
            dataSource: 'simulated',
            status: 'disconnected',
            errorMessage: null,
          },
        }));
      },

      resetConfig: () => {
        set({ config: { ...defaultConfig } });
      },
    }),
    {
      name: 'forex-ea-settings',
      partialize: (state) => ({
        config: {
          dataSource: state.config.dataSource,
          status: state.config.status,
          oanda: state.config.oanda,
          okx: state.config.okx,
          exness: state.config.exness,
          custom: state.config.custom,
        },
      }),
    }
  )
);
