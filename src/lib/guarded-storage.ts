import { recordDiagnostic } from "./diagnostics";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type ExclusiveLock = <T>(name: string, work: () => T) => Promise<T>;
export const CONFLICT_MESSAGE =
  "Dane zmieniły się w innej karcie. Nie nadpisano nowszego zapisu. Wyeksportuj swoje zmiany, a następnie odśwież stronę.";

export function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const browserLock: ExclusiveLock = (name, work) => {
  if (!globalThis.navigator?.locks)
    return Promise.reject(
      new Error(
        "Bezpieczny zapis jest niedostępny. Otwórz demo przez HTTPS lub localhost. Wyeksportuj zmiany przed zamknięciem strony.",
      ),
    );
  return navigator.locks.request(name, work);
};

// Serialize this tab's edits and compare the original bytes inside an origin-wide lock.
// An unreadable store (undefined) is never assumed to be empty (null).
export function createGuardedWriter(
  key: string,
  original: string | null | undefined,
  blocked = false,
  storage = browserStorage,
  lock: ExclusiveLock = browserLock,
) {
  let expected = original;
  let conflicted = false;
  let queue: Promise<void> = Promise.resolve();
  return (raw: string, replace = false) => {
    const pending = queue.then(() =>
      lock(`doroboty:write:${key}`, () => {
        if (conflicted) throw new Error(CONFLICT_MESSAGE);
        if (expected === undefined || (blocked && !replace))
          throw new Error(
            "Poprzedni zapis jest chroniony. Wyeksportuj zmiany; wczytaj poprawną kopię lub potwierdź reset. Jeśli odczyt był niedostępny, odśwież stronę po przywróceniu dostępu.",
          );
        const target = storage();
        if (!target)
          throw new Error("Zapis jest niedostępny. Wyeksportuj zmiany przed zamknięciem strony.");
        let current: string | null;
        try {
          current = target.getItem(key);
        } catch {
          throw new Error(
            "Nie można odczytać zapisu. Wyeksportuj zmiany przed zamknięciem strony.",
          );
        }
        if (current !== expected) {
          conflicted = true;
          throw new Error(CONFLICT_MESSAGE);
        }
        try {
          target.setItem(key, raw);
        } catch {
          throw new Error(
            "Nie udało się zapisać zmian. Wyeksportuj dane przed zamknięciem strony.",
          );
        }
        expected = raw;
        blocked = false;
      }),
    );
    const tracked = pending.catch((error: unknown) => {
      recordDiagnostic(
        error instanceof Error && error.message === CONFLICT_MESSAGE
          ? "storage-conflict"
          : "storage-write",
      );
      throw error;
    });
    queue = tracked.catch(() => {});
    return tracked;
  };
}
