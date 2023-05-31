# text-con

A react state management library that leverages react context but with fine grained reactivity 🚀

# textcon

`textcon` is a simple state-management library that is built on top of react context but provide addional essential features such as:

- **Global state management** - `textcon` provides a global state management that can be used to store data that is shared across the application.
- **Local state management** - `textcon` provides a local state management that can be used to store data that is only used in a specific component or a group of components. For instance a form data or data for a specific route.
- **Fine grained reactivity** - `textcon` support selectors out of the box to precisely control the reactivity of your components.
- **Observeables** - library allows you to observe changes in the state outside of the react component tree and react to them.

## Installation

```bash
# using npm
npm install textcon react

# using yarn
yarn add textcon react

# using pnpm
pnpm add textcon react
```

> Make sure to install `react` as well since `textcon` depends on it. `React>=17` is required.

<hr/>

## Usage

## Simple usage

Create context with some default value

```tsx
import { createContextStore } from "textcon";

// create a context store with initial value of 0
const { Provider, useStore } = createContextStore(0);
```

Wrap your component tree with the provider. It's up to you where you want to wrap your component tree with the provider. You can wrap the entire app or just a part of it.

```tsx
const App = () => {
  return (
    <Provider>
      <Counter />
    </Provider>
  );
};
```

Use the `useStore` hook to access the state and the `set` (setter) function to update the state.

```tsx
import { FC } from "react";

const Counter: FC = () => {
  const { get: count, set } = useStore();

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => set((prev) => prev + 1)}>Increment</button>
    </div>
  );
};
```

<hr/>

## Using selectors

The primary feature that differs `textcon` from the default react context is the support for selectors. With selectors, you can precisely control the reactivity of your components.

```tsx

import { createContextStore } from "textcon";

// create a context store with initial value

const { useStore, Provider } = createContextStore({
  user: {
    firstName: "John",
    lastName: "Doe",
    age: 20,
  },
  hobbies: ["reading", "coding", "gaming"],
});

const User = () => {
  const { get: user } = useStore((state) => state.user);

  return (
    <div>
      <h1>{user.firstName}</h1>
      <h1>{user.lastName}</h1>
      <h1>{user.age}</h1>
    </div>
  );
}

const Hobbies = () => {
  const { get: hobbies } = useStore((state) => state.hobbies);

  return (
    <div>
      <ul>
        {hobbies.map((hobby) => (
          <li key={hobby}>{hobby}</li>
        ))}
      </ul>
    </div>
  );
}

const UserControls() {
  const { set } = useStore();

  return (
    <>
    <button
      onClick={() =>
        set((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            firstName: "Jane",
          },
        }))
      }
    >
      Change first name
    </button>
    <button
      onClick={() =>
        set((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            lastName: "Doe",
          },
        }))
      }
    >
      Change last name
    </button>
    </>
  )
}

const App = () => {
  return (
    <Provider>
      <User />
      <UserControls/>
      <Hobbies />
    </Provider>
  );
}
```

If reducing nested state is getting out of hand, you can use the `immer` library to update the state. See the [Using Immer](#using-immer) section for more details.

<details>

<summary>User state updates with immer</summary>

Here is how you can update the `UserControls` component using `immer`.

```tsx
import {produce} from "immer";

const UserControls() {
  const { set } = useStore();

  return (
    <>
    <button
      onClick={() =>
        set(produce(state => {
          state.user.firstName = "Jane"
        }))
      }
    >
      Change first name
    </button>
    <button
      onClick={() =>
        set(produce(state => {
          state.user.lastName = "Doe"
        })
      }
    >
      Change last name
    </button>
    </>
  )
}

```

</details>

Here the `User` component will only re-render when the `user` property of the state changes and the `Hobbies` component will only re-render when the `hobbies` property of the state changes. Make sure to pass the whole state to the setter function when updating the state.

<hr/>

## With actions

`textcon` support actions out of the box. Actions are just functions that can be used to update the state. Actions are useful when you want to update the state in multiple places. For instance, you can create an action to update the user's first name and use it in multiple places. So define your actions in one place and use them in multiple places. Actoin could be `sync` or `async`. Just call the `set` and `get` functions when needed.

Actions has access to setter and getter as the first argument.

```tsx
import { createContextStore, ActionablePayload } from "textcon";

// create a context store with initial value and actions as second argument

const { useStore, Provider, useActions } = createContextStore(
  {
    user: {
      firstName: "John",
      lastName: "Doe",
      age: 20,
    },
    count: 0,
    loading: false,
  },
  {
    increment: ({ set, get }) => {
      set((prev) => ({
        ...prev,
        count: get().count + 1,
      }));
    },
    decrement: ({ set, get }) => {
      set((prev) => ({
        ...prev,
        count: get().count - 1,
      }));
    },
    // the second argument is the action of type ActionablePayload
    decrementBy: ({ set, get }, action: ActionablePayload<number>) => {
      set((prev) => ({
        ...prev,
        count: get().count - action.payload,
      }));
    },
    updateFirstName: ({ set, get }, action: ActionablePayload<string>) => {
      set((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          firstName: action.payload,
        },
      }));
    },
    updateUser: async ({ set, get }, action: ActionablePayload<User>) => {
      set((prev) => ({
        ...prev,
        loading: true,
      }));
      await updateUserOnServer(action.payload); // some async operation
      set((prev) => ({
        ...prev,
        user: action.payload,
        loading: false,
      }));
    },
    // ...
  }
);
```

<details>
  <summary>Simple implemenrations with immer</summary>

See the [Using Immer](#using-immer) section for more details.

```tsx
const { Provider, useStore, useActions } = createContextStore(
  {
    user: {
      firstName: "John",
      lastName: "Doe",
      age: 20,
      email: "",
    },
    count: 0,
  },
  {
    increment: ({ set }) => {
      set(
        produce((state) => {
          state.count += 1;
        })
      );
    },
    decrement: ({ set }) => {
      set(
        produce((state) => {
          state.count -= 1;
        })
      );
    },
    incrementBy: ({ set }, action: ActionablePayload<{ by: number }>) => {
      console.log(action?.payload || "No payload");
      set(
        produce((state) => {
          state.count = state.count + (action?.payload?.by || 10);
        })
      );
    },
    updateFirstName: ({ set }, action: ActionablePayload<string>) => {
      set(
        produce((state) => {
          state.user.firstName = action?.payload || "";
        })
      );
    },
    updateLastName: ({ set }, action: ActionablePayload<string>) => {
      set(
        produce((state) => {
          state.user.lastName = action?.payload || "";
        })
      );
    },
    asyncAction: async ({ set }, action: ActionablePayload<string>) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      set(
        produce((state) => {
          state.user.firstName = action?.payload || "";
        })
      );
    },
  }
);
```

</details>

<hr/>

## Global state

State can be preserved between monting and unmounting of `Provider`. This is useful when you want to preserve the state between routes and don't want the provider at the top of the component tree.

```tsx
import { createContextStore } from "textcon";

// create a context store with initial value

const { useStore, Provider } = createContextStore(
  {
    user: {
      firstName: "John",
      lastName: "Doe",
      age: 20,
    },
    hobbies: ["reading", "coding", "gaming"],
  },
  {
    // ...
  },
  {
    // preserve state between mounting and unmounting of provider
    global: true,
  }
);
```

<hr/>

## Using Immer

Let's just agree that for depply nested objects, passing/coppying the whole state to the setter function is a tedious task. That's why `textcon` provides a way to use `immer` to update the state.

```tsx
import { createContextStore } from "textcon";

// create a context store with initial value

const { useStore, Provider } = createContextStore(
  {
    user: {
      firstName: "John",
      lastName: "Doe",
      age: 20,
    },
    hobbies: ["reading", "coding", "gaming"],
  },
  {
    // ...
    updateFirstName: ({ set }, action: ActionablePayload<string>) => {
      set(
        produce((state) => {
          state.user.firstName = action.payload;
        })
      );
    },
    updateLastName: ({ set }, action: ActionablePayload<string>) => {
      set(
        produce((state) => {
          state.user.lastName = action.payload;
        })
      );
    },
    // ...
  }
);
```
