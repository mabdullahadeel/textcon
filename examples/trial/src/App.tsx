import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
// import { ActionablePayload, createContextStore } from "../../../src/create";
import { ActionablePayload, createContextStore } from "textcon";
import { produce } from "immer";

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
  }
);

function FirstNameDisplay() {
  const { get: firstName } = useStore((state) => state.user.firstName);

  return <div>{firstName}</div>;
}

function LastNameDisplay() {
  const { get: lastName } = useStore((state) => state.user.lastName);

  return <div>{lastName}</div>;
}

function FirstNameUpdater() {
  const { updateFirstName } = useActions();

  return (
    <button onClick={() => updateFirstName("Jane " + Math.random())}>
      Update first name
    </button>
  );
}

function LastNameUpdater() {
  const { updateLastName } = useActions();

  return (
    <button onClick={() => updateLastName("Jackson " + Math.random())}>
      Update last name
    </button>
  );
}

function UserDisplay() {
  return (
    <>
      <FirstNameDisplay />
      <LastNameDisplay />
    </>
  );
}

function UserUpdater() {
  return (
    <>
      <FirstNameUpdater />
      <LastNameUpdater />
    </>
  );
}

function App() {
  const { get: count } = useStore((state) => state.count);
  const { increment, decrement, incrementBy } = useActions();

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => increment()}>increment: {count}</button>
        <button onClick={() => decrement()}>decrement</button>
        <button onClick={() => incrementBy({ by: 10 })}>By</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

function Root() {
  return (
    <Provider>
      <App />
      <UserDisplay />
      <UserUpdater />
    </Provider>
  );
}

export default Root;
