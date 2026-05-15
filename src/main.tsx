import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './styles/index.css';
import { useMarketStore } from './stores/marketStore';
import { dataSourceManager } from './engine/data-source-manager';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2196F3' },
    secondary: { main: '#8B8D97' },
    success: { main: '#00C853' },
    error: { main: '#FF1744' },
    warning: { main: '#FFD600' },
    background: {
      default: '#0D0E12',
      paper: '#16181E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8B8D97',
    },
    divider: '#2A2D3A',
  },
  typography: {
    fontFamily: "system-ui, -apple-system, 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif",
    fontSize: 14,
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          background: '#16181E',
        },
      },
    },
  },
});

// 应用启动：初始化行情、数据源（延迟到 Zustand persist 反序列化完成后）
useMarketStore.getState().initializeQuotes();
setTimeout(() => {
  dataSourceManager.init();
  console.log('[App] 数据源管理器已初始化 (延迟确保持久化完成)');
}, 50);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
