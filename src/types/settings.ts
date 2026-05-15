/** 数据源类型 */
export type DataSourceType = 'simulated' | 'oanda' | 'okx' | 'exness' | 'custom';

/** 数据源连接状态 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** OANDA API 配置 */
export interface OandaConfig {
  apiKey: string;
  accountId: string;
  environment: 'practice' | 'live';
}

/** OKX API 配置（加密货币） */
export interface OkxConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  environment: 'demo' | 'live';
  leverage?: number; // 合约杠杆倍数
  marginMode?: 'isolated' | 'cross';
}

/** Exness API 配置 */
export interface ExnessConfig {
  apiKey: string;
  accountId: string;
  serverUrl: string;
  environment: 'demo' | 'live';
}

/** 自定义 API 配置 */
export interface CustomApiConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  wsUrl?: string;
  serverUrl?: string;
}

/** API 连接配置 */
export interface ApiConnectionConfig {
  dataSource: DataSourceType;
  oanda: OandaConfig;
  okx: OkxConfig;
  exness: ExnessConfig;
  custom: CustomApiConfig;
  status: ConnectionStatus;
  lastConnected: number | null;
  errorMessage: string | null;
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  accountInfo?: {
    balance: number;
    currency: string;
    leverage: number;
  };
  error?: string;
}

/** 通用 API 连接器接口 */
export interface DataSourceConnector {
  readonly name: string;
  readonly type: DataSourceType;
  connect(config: OandaConfig | OkxConfig | ExnessConfig | CustomApiConfig): Promise<ConnectionTestResult>;
  disconnect(): Promise<void>;
  fetchQuotes(symbols: string[]): Promise<any>;
  subscribeQuotes(symbols: string[], callback: (data: any) => void): () => void;
  isConnected(): boolean;
}
