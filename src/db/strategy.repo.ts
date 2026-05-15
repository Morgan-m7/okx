import db from './index';
import type { StrategyConfig, StrategyFamily } from '../types/strategy';

class StrategyRepo {
  async getAll(): Promise<StrategyConfig[]> {
    return db.strategies.toArray();
  }

  async getById(id: string): Promise<StrategyConfig | undefined> {
    return db.strategies.get(id);
  }

  async getByFamily(family: StrategyFamily): Promise<StrategyConfig[]> {
    return db.strategies.where('family').equals(family).toArray();
  }

  async getActive(): Promise<StrategyConfig[]> {
    return db.strategies.where('isActive').equals(1).toArray();
  }

  async create(strategy: StrategyConfig): Promise<string> {
    await db.strategies.add(strategy);
    return strategy.id;
  }

  async update(id: string, changes: Partial<StrategyConfig>): Promise<void> {
    await db.strategies.update(id, changes);
  }

  async delete(id: string): Promise<void> {
    await db.strategies.delete(id);
  }

  async deleteAll(): Promise<void> {
    await db.strategies.clear();
  }
}

export const strategyRepo = new StrategyRepo();
