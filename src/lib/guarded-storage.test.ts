import { describe, expect, it, vi } from "vitest";
import { CONFLICT_MESSAGE, createGuardedWriter, type ExclusiveLock } from "./guarded-storage";

function fixture(initial: string | null = null) {
  let value = initial;
  let queue = Promise.resolve();
  const lock: ExclusiveLock = (_name, work) => {
    const task = queue.then(work);
    queue = task.then(
      () => {},
      () => {},
    );
    return task;
  };
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  return {
    storage,
    writer: (blocked = false) => createGuardedWriter("test", value, blocked, () => storage, lock),
  };
}

describe("guarded local persistence", () => {
  it("serializes simultaneous tabs and rejects the stale writer without data loss", async () => {
    const f = fixture();
    const a = f.writer(),
      b = f.writer();
    const results = await Promise.allSettled([a("new question"), b("stale note")]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(f.storage.getItem()).toBe("new question");
    await expect(b("reset", true)).rejects.toThrow(CONFLICT_MESSAGE);
    expect(f.storage.getItem()).toBe("new question");
    await f.writer()("reloaded");
    expect(f.storage.getItem()).toBe("reloaded");
  });
  it("queues rapid edits from one tab in order", async () => {
    const f = fixture();
    const write = f.writer();
    await Promise.all([write("a"), write("ab"), write("abc")]);
    expect(f.storage.getItem()).toBe("abc");
  });
  it("preserves corrupt data until an explicit replacement, but never replaces a newer save", async () => {
    const f = fixture("broken");
    const write = f.writer(true);
    await expect(write("draft")).rejects.toThrow("chroniony");
    expect(f.storage.getItem()).toBe("broken");
    await write("valid", true);
    expect(f.storage.getItem()).toBe("valid");
    const stale = f.writer(true);
    await write("newer");
    await expect(stale("import", true)).rejects.toThrow(CONFLICT_MESSAGE);
  });
  it("does not advance the snapshot after a quota failure and permits a later retry", async () => {
    const f = fixture("old");
    const write = f.writer();
    const set = f.storage.setItem;
    f.storage.setItem = () => {
      throw new Error("Quota");
    };
    await expect(write("new")).rejects.toThrow("Wyeksportuj");
    expect(f.storage.getItem()).toBe("old");
    f.storage.setItem = set;
    await write("retry");
    expect(f.storage.getItem()).toBe("retry");
  });
  it("does not turn an unreadable snapshot or unavailable lock into an empty store", async () => {
    const f = fixture("protected");
    const direct: ExclusiveLock = async (_name, work) => work();
    await expect(
      createGuardedWriter("test", undefined, false, () => f.storage, direct)("reset", true),
    ).rejects.toThrow("chroniony");
    vi.stubGlobal("navigator", {});
    await expect(
      createGuardedWriter("test", "protected", false, () => f.storage)("new"),
    ).rejects.toThrow("Bezpieczny zapis");
    vi.unstubAllGlobals();
    expect(f.storage.getItem()).toBe("protected");
  });
});
