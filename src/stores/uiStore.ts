import { create } from 'zustand';

type TabId = 'market' | 'chart' | 'strategy' | 'trading' | 'performance' | 'settings';

interface UIState {
  activeTab: TabId;
  isModalOpen: boolean;
  modalType: string | null;
  modalData: any;
  theme: 'dark';
  isMobile: boolean;
  notifications: string[];

  setActiveTab: (tab: TabId) => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  setIsMobile: (isMobile: boolean) => void;
  addNotification: (message: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'market',
  isModalOpen: false,
  modalType: null,
  modalData: null,
  theme: 'dark',
  isMobile: true,
  notifications: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  openModal: (type, data = null) => set({
    isModalOpen: true,
    modalType: type,
    modalData: data,
  }),
  closeModal: () => set({
    isModalOpen: false,
    modalType: null,
    modalData: null,
  }),
  setIsMobile: (isMobile) => set({ isMobile }),
  addNotification: (message) => set((state) => ({
    notifications: [...state.notifications, message],
  })),
  clearNotifications: () => set({ notifications: [] }),
}));
