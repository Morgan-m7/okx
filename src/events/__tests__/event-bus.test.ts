import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../event-bus';
import { EventType } from '../../types/events';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('should call registered handler on emit', () => {
      let called = false;
      bus.on(EventType.QUOTE_UPDATED, () => {
        called = true;
      });

      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      expect(called).toBe(true);
    });

    it('should pass payload to handler', () => {
      let receivedPayload: any = null;
      bus.on(EventType.POSITION_OPENED, (payload) => {
        receivedPayload = payload;
      });

      const payload = { position: {} as any };
      bus.emit(EventType.POSITION_OPENED, payload);
      expect(receivedPayload).toBe(payload);
    });

    it('should call multiple handlers for same event', () => {
      let count = 0;
      bus.on(EventType.STRATEGY_SIGNAL, () => count++);
      bus.on(EventType.STRATEGY_SIGNAL, () => count++);

      bus.emit(EventType.STRATEGY_SIGNAL, { signal: {} as any });
      expect(count).toBe(2);
    });

    it('should not call handlers for different events', () => {
      let called = false;
      bus.on(EventType.QUOTE_UPDATED, () => called = true);

      bus.emit(EventType.CANDLE_CLOSED, { symbol: 'XAU/USD', timeframe: 'M1', candle: {} as any });
      expect(called).toBe(false);
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving events after unsubscribe', () => {
      let count = 0;
      const unsub = bus.on(EventType.QUOTE_UPDATED, () => count++);

      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      expect(count).toBe(1);

      unsub();
      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      expect(count).toBe(1);
    });
  });

  describe('once', () => {
    it('should only fire once', () => {
      let count = 0;
      bus.once(EventType.QUOTE_UPDATED, () => count++);

      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });

      expect(count).toBe(1);
    });

    it('should return unsubscribe function', () => {
      let count = 0;
      const unsub = bus.once(EventType.QUOTE_UPDATED, () => count++);

      unsub();
      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      expect(count).toBe(0);
    });
  });

  describe('removeAll', () => {
    it('should remove all handlers', () => {
      let count = 0;
      bus.on(EventType.QUOTE_UPDATED, () => count++);
      bus.on(EventType.CANDLE_CLOSED, () => count++);

      bus.removeAll();
      bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      bus.emit(EventType.CANDLE_CLOSED, { symbol: 'XAU/USD', timeframe: 'M1', candle: {} as any });

      expect(count).toBe(0);
    });
  });

  describe('listenerCount', () => {
    it('should return correct count for regular handlers', () => {
      bus.on(EventType.QUOTE_UPDATED, () => {});
      bus.on(EventType.QUOTE_UPDATED, () => {});

      expect(bus.listenerCount(EventType.QUOTE_UPDATED)).toBe(2);
    });

    it('should include once handlers in count', () => {
      bus.on(EventType.QUOTE_UPDATED, () => {});
      bus.once(EventType.QUOTE_UPDATED, () => {});

      expect(bus.listenerCount(EventType.QUOTE_UPDATED)).toBe(2);
    });

    it('should return 0 for events with no listeners', () => {
      expect(bus.listenerCount(EventType.QUOTE_UPDATED)).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should not throw when a handler throws', () => {
      bus.on(EventType.QUOTE_UPDATED, () => {
        throw new Error('Handler error');
      });
      bus.on(EventType.QUOTE_UPDATED, () => {
        // This should still be called
      });

      expect(() => {
        bus.emit(EventType.QUOTE_UPDATED, { symbol: 'XAU/USD', quote: {} as any });
      }).not.toThrow();
    });
  });
});
