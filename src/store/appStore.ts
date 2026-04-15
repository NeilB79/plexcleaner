import { create } from 'zustand';

interface AppState {
  dynamicBackgroundUrl: string | null;
  setDynamicBackgroundUrl: (url: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dynamicBackgroundUrl: null,
  setDynamicBackgroundUrl: (url) => set({ dynamicBackgroundUrl: url }),
}));
