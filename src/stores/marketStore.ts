import { create } from 'zustand';

interface MarketState {
    prices: Record<string, number>;
    timestamps: Record<string, number>;
    setPrice: (symbol: string, price: number, timestamp: number) => void;
    getPrice: (symbol: string) => number | undefined;
}

export const useMarketStore = create<MarketState>((set, get) => ({
    prices: {},
    timestamps: {},
    setPrice: (symbol, price, timestamp) =>
        set((state) => ({
            prices: { ...state.prices, [symbol]: price },
            timestamps: { ...state.timestamps, [symbol]: timestamp },
        })),
    getPrice: (symbol) => get().prices[symbol],
}));
