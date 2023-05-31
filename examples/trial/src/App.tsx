import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { ActionablePayload, createContextStore } from "../../../src/create";
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
    hobbies: ["football", "basketball"],
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
      set(produce((state) => ({ count: state.count - 1 })));
    },
    incrementBy: ({ set }, action: ActionablePayload<{ by: number }>) => {
      console.log(action?.payload || "No payload");
      set(
        produce((state) => ({
          count: state.count + (action?.payload?.by || 10),
        }))
      );
    },
  }
);

function App() {
  const { get } = useStore();
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
        <button onClick={() => increment()}>increment: {get.count}</button>
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
    </Provider>
  );
}

export default Root;
