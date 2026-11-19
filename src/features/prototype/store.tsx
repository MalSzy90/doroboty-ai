import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, transition, type Action, type State } from "./model";
import { parseState, readState, serializeState, MAX_IMPORT_BYTES, STORAGE_KEY } from "./storage";
import { browserStorage, createGuardedWriter } from "@/lib/guarded-storage";
function useStore() {
  const [loaded] = useState(() => readState(browserStorage()));
  const [write] = useState(() => createGuardedWriter(STORAGE_KEY, loaded.raw, loaded.blocked));
  const [state, setState] = useState(loaded.state);
  const [issue, setIssue] = useState(loaded.issue);
  const [error, setError] = useState("");
  const [pendingWrites, setPendingWrites] = useState(0);
  const [blocked, setBlocked] = useState(loaded.blocked);
  const latest = useRef(state);
  const persistedActions = useRef<Promise<void>>(Promise.resolve());
  async function commit(next: State, replace = false, optimistic = true) {
    if (!replace && optimistic) {
      latest.current = next;
      setState(next);
    }
    setError("");
    const raw = serializeState(next);
    if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) {
      setIssue("Dane przekraczają 2 MB. Wyeksportuj zmiany.");
      return false;
    }
    setPendingWrites((count) => count + 1);
    try {
      await write(raw, replace);
      setIssue("");
      if (replace || !optimistic) {
        latest.current = next;
        setState(next);
        if (replace) setBlocked(false);
      }
      return true;
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Nie udało się zapisać zmian. Wyeksportuj dane.");
      return false;
    } finally {
      setPendingWrites((count) => count - 1);
    }
  }
  function run(action: Action) {
    try {
      void commit(transition(latest.current, action));
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Sprawdź poprawność i długość wprowadzonych danych.",
      );
      return false;
    }
  }
  function runPersisted(action: Action): Promise<boolean> {
    const pending = persistedActions.current.then(async () => {
      try {
        return await commit(transition(latest.current, action), false, false);
      } catch (e) {
        setError(
          e instanceof Error && e.name !== "ZodError"
            ? e.message
            : "Sprawdź poprawność i długość wprowadzonych danych.",
        );
        return false;
      }
    });
    persistedActions.current = pending.then(() => {});
    return pending;
  }
  async function importState(raw: string) {
    try {
      const next = parseState(raw);
      return await commit(next, true);
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return {
    state,
    issue,
    persisted: pendingWrites === 0 && !issue,
    error,
    blocked,
    original: loaded.original,
    run,
    runPersisted,
    importState,
    clearError: () => setError(""),
    reset: () => commit(initialState(), true),
  };
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
