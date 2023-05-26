/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable max-lines-per-function */
import { act,renderHook,RenderHookOptions, RenderHookResult } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

import { createContextStore } from "./create";

const initialState = {
  count: 0,
  user: {
    name: "John",
    age: 20,
  },
  hobbies: ["football", "basketball"],
};

type HookFunction<T> = () => T;

const renderHookWithProvider = <T,>(
  hook: HookFunction<T>,
  Provider: ({ children }: { children: React.ReactNode }) => JSX.Element,
  options?: RenderHookOptions<T>
): RenderHookResult<T, T> => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>;

  return renderHook(hook, { ...options, wrapper });
};

describe("createContextStore", () => {
  let store: ReturnType<typeof createContextStore<typeof initialState>>;

  beforeEach(() => {
    store = createContextStore(initialState);
  });

  it.concurrent("should return the initial state", async () => {
    const { result } = renderHookWithProvider(() => store.useStore(), store.Provider);

    expect(result.current.get).toEqual(initialState);
  });
  it.concurrent("should return the updated state", async () => {
    const { result } = renderHookWithProvider(() => store.useStore(), store.Provider);
    act(() => {
      result.current.set({ count: 1 });
    });

    expect(result.current.get.count).toEqual(1);
  });
  it.concurrent("should return the reference to the same object if not changed", () => {
    const { result } = renderHookWithProvider(() => store.useStore(), store.Provider);
    const prevUser = result.current.get.user;
    act(() => {
      result.current.set({ count: 1 });
    });
    const userAfterCountChange = result.current.get.user;

    expect(prevUser).toBe(userAfterCountChange);

    act(() => {
      result.current.set({
        hobbies: ["gardening"],
      })
    });

    expect(prevUser).toBe(userAfterCountChange);
  })
  it.concurrent("should respect deepEqual option passed to useStore", () => {
    const {result} = renderHookWithProvider(() => store.useStore((store) => store, {
      deepEqual: false,
    }), store.Provider);
    const prevUser = result.current.get.user;
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });
    const userAfterChange = result.current.get.user;

    expect(prevUser).toBe(userAfterChange);
  });
  it.concurrent("should call compare function passed to useStore", () => {
    const compare = vi.fn(() => true);
    const {result} = renderHookWithProvider(() => store.useStore((store) => store, {
      compare,
    }), store.Provider);
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });

    expect(compare).toBeCalled();
  });
  it.concurrent("should cause re-render if compare returns false", () => {
    const compare = vi.fn(() => false);
    const {result} = renderHookWithProvider(() => store.useStore((store) => store, {
      compare,
    }), store.Provider);
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });

    expect(compare).toBeCalled();
    expect(result.current.get.user.name).toEqual("Micheal");
  })
  it.concurrent("should not cause re-render if compare returns true", () => {
    const compare = vi.fn(() => true);
    const {result} = renderHookWithProvider(() => store.useStore((store) => store, {
      compare,
    }), store.Provider);
    const prevUser = result.current.get.user;
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });

    expect(result.current.get.user).toEqual(prevUser);
  })
  test.concurrent("selector is called with the current state", () => {
    const selector = vi.fn((state) => state.user);
    renderHookWithProvider(() => store.useStore(selector), store.Provider);
    expect(selector).toBeCalledWith(initialState);
  });
  test.concurrent("selector is called with the current state after update", () => {
    const selector = vi.fn((state) => state.user);
    const { result } = renderHookWithProvider(() => store.useStore(selector), store.Provider);
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });
    expect(selector).toBeCalledWith({
      ...initialState,
      user: {
        name: "Micheal",
        age: 30,
      },
    });
  });
  test.concurrent("selector passed to userStore returns correct value", () => {
    const selector = vi.fn((state: typeof initialState) => state.user);
    const { result } = renderHookWithProvider(() => store.useStore(selector), store.Provider);
    expect(result.current.get).toEqual(initialState.user);
  });
  test.concurrent("hook returns a selctor function that returns the correct value", () => {
    const { result } = renderHookWithProvider(() => store.useStore((state) => state.user), store.Provider);
    expect(result.current.selector()).toEqual(initialState);
  });
  test.concurrent("hook returns a selctor function that returns the correct value after update", () => {
    const { result } = renderHookWithProvider(() => store.useStore((state) => state.user), store.Provider);
    act(() => {
      result.current.set({
        user: {
          name: "Micheal",
          age: 30,
        },
      });
    });
    expect(result.current.selector()).toEqual({
      ...initialState,
      user: {
        name: "Micheal",
        age: 30,
      },
    });
  });
  it.concurrent("should only cause re-render if selected value changes", () => {
    const selector = vi.fn((state: typeof initialState) => state.user);
    const { result } = renderHookWithProvider(() => store.useStore(selector), store.Provider);
    const prevUser = result.current.get;
    act(() => {
      result.current.set({
        count: 1,
      });
    });

    expect(result.current.get).toBe(prevUser);
  });
});
