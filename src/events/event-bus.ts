import { EventType } from '../types/events';
import type { EventPayloadMap } from '../types/events';

type EventHandler<T = any> = (payload: T) => void;
type Unsubscribe = () => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private onceHandlers: Map<string, Set<EventHandler>> = new Map();

  on<E extends EventType>(
    event: E,
    handler: EventHandler<EventPayloadMap[E]>
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  once<E extends EventType>(
    event: E,
    handler: EventHandler<EventPayloadMap[E]>
  ): Unsubscribe {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler);

    return () => {
      this.onceHandlers.get(event)?.delete(handler);
    };
  }

  emit<E extends EventType>(
    event: E,
    payload: EventPayloadMap[E]
  ): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${event}:`, error);
        }
      });
    }

    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in once-handler for ${event}:`, error);
        }
      });
      this.onceHandlers.delete(event);
    }
  }

  removeAll(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  listenerCount(event: EventType): number {
    const handlers = this.handlers.get(event);
    const onceHandlers = this.onceHandlers.get(event);
    return (handlers?.size || 0) + (onceHandlers?.size || 0);
  }
}

const globalEventBus = new EventBus();
export default globalEventBus;
