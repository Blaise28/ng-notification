import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { UserModel } from '@components/auth/auth.models';
import { IDB_SESSION_KEY, IDB_STORE } from '../../models/idb.models';
import { StorageService } from '@services/storage/storage.service';

export interface SessionState {
  user: UserModel | null;
  access: string | null;
  hydrated: boolean;
}

type PersistedSessionState = Omit<SessionState, 'hydrated'>;

const initialSessionState: SessionState = {
  user: null,
  access: null,
  hydrated: false,
};

export const UserStore = signalStore(
  { providedIn: 'root' },

  withState<SessionState>(initialSessionState),

  withMethods((store) => {
    const storageService = inject(StorageService);
    let hydrationPromise: Promise<void> | null = null;

    function persistSession(session: PersistedSessionState): void {
      void storageService.put(IDB_STORE.SESSION, IDB_SESSION_KEY, session).catch((error) => {
        console.error('Failed to persist session.', error);
      });
    }

    function clearPersistedSession(): void {
      void storageService.clear(IDB_STORE.SESSION).catch((error) => {
        console.error('Failed to clear persisted session.', error);
      });
    }

    return {
      async hydrate(): Promise<void> {
        if (store.hydrated()) {
          return;
        }

        if (!hydrationPromise) {
          hydrationPromise = (async () => {
            await storageService.init();
            const session = await storageService.get<PersistedSessionState>(
              IDB_STORE.SESSION,
              IDB_SESSION_KEY,
            );
            if (!session) {
              patchState(store, { hydrated: true });
              return;
            }

            patchState(store, { ...initialSessionState, ...session, hydrated: true });
          })().finally(() => {
            hydrationPromise = null;
          });
        }

        await hydrationPromise;
      },

      setSession(session: PersistedSessionState): void {
        patchState(store, { ...session, hydrated: true });
        persistSession(session);
      },

      clearSession(): void {
        patchState(store, { ...initialSessionState, hydrated: true });
        clearPersistedSession();
      },
    };
  }),
);
