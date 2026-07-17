import { Service, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { IDB_INACTIVITY_MS, IDB_LAST_USED_KEY, IDB_STORE } from '../../models/idb.models';

const DB_NAME = 'notification-db';
const DB_VERSION = 1;

@Service()
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.db = await this.openDatabase();

        const lastUsed = await this.readRaw<number>(IDB_STORE.SESSION, IDB_LAST_USED_KEY);
        if (lastUsed) {
          const inactiveFor = Date.now() - lastUsed;
          if (inactiveFor > IDB_INACTIVITY_MS) {
            await this.clearRaw(IDB_STORE.SESSION);
          }
        }

        await this.writeRaw(IDB_STORE.SESSION, IDB_LAST_USED_KEY, Date.now());
      } catch (error) {
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.ensureReady();
    if (!this.db) {
      return null;
    }

    const value = await this.readRaw<T>(storeName, key);
    await this.touchLastUsed();
    return value;
  }

  async put<T>(storeName: string, key: string, value: T): Promise<void> {
    await this.ensureReady();
    if (!this.db) {
      return;
    }

    await this.writeRaw(storeName, key, value);
    await this.touchLastUsed();
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) {
      return;
    }

    await this.deleteRaw(storeName, key);
    await this.touchLastUsed();
  }

  async clear(storeName: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) {
      return;
    }

    await this.clearRaw(storeName);
    await this.touchLastUsed();
  }

  private async ensureReady(): Promise<void> {
    if (!this.isBrowser || this.db) {
      return;
    }
    await this.init();
  }

  private async touchLastUsed(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.writeRaw(IDB_STORE.SESSION, IDB_LAST_USED_KEY, Date.now());
  }

  private async readRaw<T>(storeName: string, key: string): Promise<T | null> {
    const value = await this.runRequest<T | undefined>(storeName, 'readonly', (store) =>
      store.get(key),
    );
    return value ?? null;
  }

  private async writeRaw<T>(storeName: string, key: string, value: T): Promise<void> {
    await this.runRequest(storeName, 'readwrite', (store) => store.put(value, key));
  }

  private async deleteRaw(storeName: string, key: string): Promise<void> {
    await this.runRequest(storeName, 'readwrite', (store) => store.delete(key));
  }

  private async clearRaw(storeName: string): Promise<void> {
    await this.runRequest(storeName, 'readwrite', (store) => store.clear());
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE.SESSION)) {
          db.createObjectStore(IDB_STORE.SESSION);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private runRequest<T>(
    storeName: string,
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = this.db;
    if (!database) {
      return Promise.reject(new Error('IndexedDB is not initialized.'));
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = createRequest(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
