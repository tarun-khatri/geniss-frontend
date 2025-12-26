import { useEffect } from 'react';
import { ably } from '../lib/ably';
import { useMarketStore } from '../stores/marketStore';

const PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD', 'AVAX-USD', 'MATIC-USD', 'DOT-USD']; // Supported pairs

export function PriceListener(): null {
    const setPrice = useMarketStore((state) => state.setPrice);

    useEffect(() => {
        // Connect if not connected
        if (ably.connection.state !== 'connected' && ably.connection.state !== 'connecting') {
            ably.connect();
        }

        const channels = PAIRS.map(pair => ably.channels.get(`ticker-${pair}`));

        channels.forEach(channel => {
            channel.subscribe('price_update', (message) => {
                const { symbol, price, timestamp } = message.data;
                // Map back to display format if needed, backend sends 'BTC-USD'
                setPrice(symbol, price, timestamp);
            });
        });

        return () => {
            channels.forEach(channel => channel.unsubscribe());
            // Don't close connection here if shared with RiskListener
        };
    }, [setPrice]);

    return null; // Invisible component
}
