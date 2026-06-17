import { EventEmitter } from 'events';
import { Order } from '../domain/entities/Order';

/**
 * Typed event payloads — every event in the system is declared here.
 * Adding a new event = add it to this map. TypeScript enforces correct
 * payload shape at every emit() and on() call site.
 */
export interface EventMap {
  'order.placed': {
    order: Order;
    userId: string;
    userCount: number; // user's personal order count after this order
  };
}

class TypedEventBus {
  private emitter = new EventEmitter();

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void
  ): void {
    this.emitter.on(event, handler);
  }
}

/**
 * Singleton event bus — shared across the application.
 * In production this would be replaced by a message broker (SQS, Kafka)
 * implementing the same TypedEventBus interface.
 */
export const eventBus = new TypedEventBus();
