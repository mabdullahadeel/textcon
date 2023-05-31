/* eslint-disable @typescript-eslint/no-explicit-any */
import isEqual from "lodash.isequal";
import React, { createContext, useCallback, useContext, useRef } from "react";

// explicit import from shim allow to use with react >= 17
import { useSyncExternalStore } from "use-sync-external-store/shim";

function deepEqual(first: any, second: any) {
  return isEqual(first, second);
}

export type SelectorOptions<Selected> = {
  deepEqual?: boolean;
  compare?: (first: Selected, second: Selected) => boolean;
};

export type ContextOptions = {
  global?: boolean;
};

type SetterArgs<Store> = Store | ((prev: Store) => Store);
type ExtractActionKeys<T> = {
  [K in keyof T]: T[K] extends (
    stateProps: never,
    action: infer A
  ) => void | Promise<void>
    ? A extends ActionablePayload<infer Payload>
      ? Payload extends undefined
        ? () => void
        : (payload: Payload) => void
      : () => void
    : never;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

export type ActionablePayload<Payload = any> = {
  payload: Payload;
};

type StateActionProps<Store> = {
  set: (value: SetterArgs<Store>) => void;
  get: () => Store;
};

type Actions<Store> = {
  [key: string]: (
    stateProps: StateActionProps<Store>,
    action: ActionablePayload
  ) => void | Promise<void>;
};

type ContextReturnType<Store, A extends Actions<Store>> = {
  Provider: React.FC<{ children: React.ReactNode }>;
  useStore: <SelectorOutput = Store>(
    selector?: (store: Store) => SelectorOutput,
    options?: SelectorOptions<SelectorOutput>
  ) => {
    get: SelectorOutput;
    set: (value: SetterArgs<Store>) => void;
    selector: () => Store;
  };
  useActions: () => Prettify<ExtractActionKeys<A>>;
  subscribe: (
    selector: (store: Store) => Store,
    callback: (state: Store) => void,
    options?: SelectorOptions<Store>
  ) => () => void;
  unsubscribe: (callback: (state: Store) => void) => void;
};

function isFunction(value: any): value is (prev: any) => any {
  return typeof value === "function";
}

export function createContextStore<Store, A extends Actions<Store>>(
  ...args: Extract<A, { payload: A }> extends { payload: infer Payload }
    ? [initialState: Store, actions?: A, options?: ContextOptions]
    : [initialState: Store, options?: ContextOptions]
): ContextReturnType<Store, A>;

// eslint-disable-next-line max-lines-per-function
export function createContextStore<Store, A extends Actions<Store>>(
  initialState: Store,
  actions: A = {} as A,
  options: ContextOptions = {}
): ContextReturnType<Store, A> {
  let globalStore: Store | undefined = options.global
    ? initialState
    : undefined;

  function useStoreData({
    defaultSubscriber = [],
  }: {
    defaultSubscriber?: ((state: Store) => void)[];
  } = {}): {
    get: () => Store;
    set: (value: SetterArgs<Store>) => void;
    subscribe: (callback: () => void) => () => void;
  } {
    const store = useRef<Store>(globalStore ?? initialState);

    const get = useCallback(() => store.current, []);

    const subscribers = useRef(
      new Set<(state: Store) => void>(defaultSubscriber)
    );

    const set = useCallback((value: SetterArgs<Store>) => {
      store.current = isFunction(value) ? value(store.current) : value;

      if (options.global) {
        globalStore = store.current;
      }

      subscribers.current.forEach((callback) => callback(store.current));
    }, []);

    const subscribe = useCallback((callback: () => void) => {
      subscribers.current.add(callback);

      return () => subscribers.current.delete(callback);
    }, []);

    return {
      get,
      set,
      subscribe,
    };
  }

  type UseStoreDataReturnType = ReturnType<typeof useStoreData>;

  const StoreContext = createContext<UseStoreDataReturnType | null>(null);

  /**
   * This is the provider that will be used to wrap the react component tree
   * to provide the store to all the components in the tree.
   */
  function Provider({ children }: { children: React.ReactNode }) {
    return (
      <StoreContext.Provider
        value={useStoreData({ defaultSubscriber: [observable.broadcast] })}
      >
        {children}
      </StoreContext.Provider>
    );
  }

  /**
   * This holds all the observables that are subscribed to the store
   * but not being actively used by any component. Helps to broadcast
   * store updates to all the observables that are interested in reacting
   * to state outside the react component tree.
   */
  const observers = new Set<(state: Store) => void>();

  function subscribeExternal<SelectorOutput = Store>(
    selector: (store: Store) => SelectorOutput = (store) =>
      store as unknown as SelectorOutput,
    callback: (state: SelectorOutput) => void,
    options: SelectorOptions<SelectorOutput> = {
      deepEqual: false,
    }
  ): () => void {
    let lastSelectedState: SelectorOutput | undefined;

    const shouldSendUpdates = (newSelectedState: SelectorOutput) => {
      if (
        lastSelectedState === undefined ||
        (options.compare &&
          !options.compare(lastSelectedState, newSelectedState)) ||
        (options.deepEqual && !deepEqual(lastSelectedState, newSelectedState))
      ) {
        lastSelectedState = newSelectedState;

        return true;
      }

      return false;
    };

    const selectedCb = (store: Store) => {
      const selected = selector(store);
      const shouldSend = shouldSendUpdates(selected);

      if (shouldSend) {
        callback(selector(store));
      }
    };
    observers.add(selectedCb);

    return () => observers.delete(selectedCb);
  }

  /**
   * A simple observable that proxy store updates to all the subscribers
   * that are interested in reacting to state outside the react component tree.
   */
  const observable = {
    subscribe: subscribeExternal,
    unsubscribe: (callback: (state: Store) => void) => {
      observers.delete(callback);
    },
    broadcast: (state: Store) => {
      observers.forEach((callback) => callback(state));
    },
  } as const;

  /**
   * This is the hook that will be used to access the store from any component
   * in the react component tree.
   * @param selector A function that will be used to select the part of the store
   * that is needed by the component.
   * @param options Options to customize the behavior of the hook.
   * @returns An object with the selected state, a function to update the store
   * and a function to get the entire store.
   * @example
   * ```tsx
   *  const { get, set } = useStore(store => store.user);
   *  const { get, set } = useStore(store => store.user, { deepEqual: false });
   *  const { get, set } = useStore(store => store.user, {
   *      compare: (first, second) => first.id === second.id
   *  });
   * ```
   */

  function useStore<SelectorOutput = Store>(
    selector: (store: Store) => SelectorOutput = (store) =>
      store as unknown as SelectorOutput,
    options: SelectorOptions<SelectorOutput> = {}
  ): {
    get: SelectorOutput;
    set: (value: SetterArgs<Store>) => void;
    selector: () => Store;
  } {
    const store = useContext(StoreContext);
    const lastSelectedState = useRef<SelectorOutput | undefined>();

    if (!store) {
      throw new Error("Store not found");
    }

    const { deepEqual: deepEqualOption = true, compare } = options;

    const state = useSyncExternalStore(
      store.subscribe,
      () => {
        const selectedState = selector(store.get());

        if (
          lastSelectedState.current === undefined ||
          (compare && !compare(lastSelectedState.current, selectedState)) ||
          (lastSelectedState.current !== selectedState &&
            deepEqualOption &&
            !compare &&
            !deepEqual(lastSelectedState.current, selectedState))
        ) {
          lastSelectedState.current = selectedState;
        }

        return lastSelectedState.current;
      },
      () => selector(initialState)
    );

    return {
      get: state,
      set: store.set,
      selector: () => store.get(),
    };
  }

  function useActions() {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error("Store not found");
    }

    const actionProxy = new Proxy(actions, {
      get: (target, prop) => {
        const action = target[prop as string];

        if (action) {
          return (args: Parameters<typeof action>["1"]) => {
            action(
              {
                set: store.set,
                get: store.get,
              },
              {
                payload: args,
              }
            );
          };
        }
      },
      set: () => {
        throw new Error("Actions cannot be updated");
      },
    });

    return actionProxy as unknown as ExtractActionKeys<typeof actions>;
  }

  return {
    Provider,
    useStore,
    useActions,
    subscribe: observable.subscribe,
    unsubscribe: observable.unsubscribe,
  };
}
