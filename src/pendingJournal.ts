import type { Operation } from "./operations";

export type Pending = { userId: number; server: string; operation: Operation };
export interface JournalStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

// One unresolved command per account/server. Signing out only hides it.
// Storage is injected so persistence, migration and failure paths can be tested.
export class PendingJournal {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: JournalStorage) {}

  private async read(): Promise<Pending[]> {
    const raw = await this.storage.read();
    if (!raw) return [];
    const saved = JSON.parse(raw);
    // Migrate the single-record journal from 1.0.1 without discarding it.
    return Array.isArray(saved) ? saved : [saved];
  }

  async find(userId: number, server: string): Promise<Pending | null> {
    await this.queue.catch(() => {});
    return (await this.read()).find(p => p.userId === userId && p.server === server) ?? null;
  }

  private update(change: (items: Pending[]) => Pending[]) {
    const next = this.queue.catch(() => {}).then(async () => {
      const items = change(await this.read());
      await this.storage.write(JSON.stringify(items));
    });
    this.queue = next;
    return next;
  }

  save(item: Pending) {
    return this.update(items => {
      if (items.some(p => p.userId === item.userId && p.server === item.server))
        throw new Error("Сначала проверьте неподтверждённую операцию.");
      return [...items, item];
    });
  }

  remove(item: Pending) {
    return this.update(items => items.filter(p => JSON.stringify(p) !== JSON.stringify(item)));
  }
}
