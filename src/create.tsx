import isEqual from "lodash.isequal";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
} from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

type SetterArgs<Store> = Partial<Store> | ((prev: Store) => Partial<Store>);

// eslint-disable-next-line max-lines-per-function
export function createContextStore<Store>(
  initialState: Store,
  options: ContextOptions = {}
) {
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
    const store = useRef(globalStore ?? initialState);

    const get = useCallback(() => store.current, []);

    const subscribers = useRef(
      new Set<(state: Store) => void>(defaultSubscriber)
    );

    const set = useCallback((value: SetterArgs<Store>) => {
      if (typeof value === "function") {
        value = value(store.current);
      }

      store.current = { ...store.current, ...value };

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

  return {
    Provider,
    useStore,
    subscribe: observable.subscribe,
    unsubscribe: observable.unsubscribe,
  };
}