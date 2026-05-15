import { useEffect } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { marketDataGenerator } from '../engine/market-data-generator';

export function useMarketData(): void {
  const updateQuotes = useMarketStore((s) => s.updateQuotes);
  const initializeQuotes = useMarketStore((s) => s.initializeQuotes);

  useEffect(() => {
    initializeQuotes();

    marketDataGenerator.setOnQuoteUpdate((quotes) => {
      updateQuotes(quotes);
    });

    marketDataGenerator.start(3000);

    return () => {
      marketDataGenerator.stop();
    };
  }, []);
}
