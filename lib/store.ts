import { create } from "zustand";
import { subDays, startOfDay, endOfDay } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface AppStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: string) => void;

  user: any;
  setUser: (user: any) => void;

  org: any;
  setOrg: (org: any) => void;

  subscription: any;
  setSubscription: (sub: any) => void;

  isScanning: boolean;
  setScanning: (scanning: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  dateRange: {
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
    label: "7d",
  },
  setDateRange: (range) => set({ dateRange: range }),
  setPreset: (preset) => {
    const now = new Date();
    const map: Record<string, DateRange> = {
      today: { from: startOfDay(now), to: endOfDay(now), label: "today" },
      yesterday: {
        from: startOfDay(subDays(now, 1)),
        to: endOfDay(subDays(now, 1)),
        label: "yesterday",
      },
      "7d": {
        from: startOfDay(subDays(now, 7)),
        to: endOfDay(now),
        label: "7d",
      },
      "14d": {
        from: startOfDay(subDays(now, 14)),
        to: endOfDay(now),
        label: "14d",
      },
      "30d": {
        from: startOfDay(subDays(now, 30)),
        to: endOfDay(now),
        label: "30d",
      },
    };
    if (map[preset]) set({ dateRange: map[preset] });
  },

  user: null,
  setUser: (user) => set({ user }),

  org: null,
  setOrg: (org) => set({ org }),

  subscription: null,
  setSubscription: (subscription) => set({ subscription }),

  isScanning: false,
  setScanning: (isScanning) => set({ isScanning }),
}));
