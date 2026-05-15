import db from './index';
import type { Position, SymbolPair } from '../types';

class PositionRepo {
  async getAll(): Promise<Position[]> {
    return db.positions.toArray();
  }

  async getById(id: string): Promise<Position | undefined> {
    return db.positions.get(id);
  }

  async getBySymbol(symbol: SymbolPair): Promise<Position[]> {
    return db.positions.where('symbol').equals(symbol).toArray();
  }

  async getByStrategyId(strategyId: string): Promise<Position[]> {
    return db.positions.where('strategyId').equals(strategyId).toArray();
  }

  async getActivePositions(): Promise<Position[]> {
    return db.positions.toArray();
  }

  async create(position: Position): Promise<string> {
    await db.positions.add(position);
    return position.id;
  }

  async update(id: string, changes: Partial<Position>): Promise<void> {
    await db.positions.update(id, changes);
  }

  async delete(id: string): Promise<void> {
    await db.positions.delete(id);
  }

  async deleteAll(): Promise<void> {
    await db.positions.clear();
  }
}

export const positionRepo = new PositionRepo();
