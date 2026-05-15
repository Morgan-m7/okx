import db from './index';
import type { Account } from '../types/trading';

class AccountRepo {
  async getAll(): Promise<Account[]> {
    return db.accounts.toArray();
  }

  async getById(id: number): Promise<Account | undefined> {
    return db.accounts.get(id);
  }

  async getLatest(): Promise<Account | undefined> {
    const accounts = await db.accounts.orderBy('id').reverse().toArray();
    return accounts[0];
  }

  async create(account: Account): Promise<number> {
    return db.accounts.add(account);
  }

  async update(id: number, changes: Partial<Account>): Promise<void> {
    await db.accounts.update(id, changes);
  }

  async delete(id: number): Promise<void> {
    await db.accounts.delete(id);
  }

  async reset(): Promise<void> {
    await db.accounts.clear();
  }
}

export const accountRepo = new AccountRepo();
