import { useEffect, useState } from "react";
import { apiRequest } from "./lib/api.js";
import "./App.css";

function App() {
  const [apiState, setApiState] = useState({
    status: "loading",
    message: "Connecting to the Ordanly API...",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkApiHealth() {
      try {
        const result = await apiRequest("/api/health", {
          signal: controller.signal,
        });

        setApiState({
          status: "online",
          message: `${result.data.service} is online`,
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setApiState({
          status: "offline",
          message: error.message,
        });
      }
    }

    checkApiHealth();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="status-card">
        <div className="brand-mark">O</div>

        <p className="eyebrow">Ordanly workspace</p>
        <h1>Plan clearly. Move work forward.</h1>

        <p className="intro">
          A simple place to organize projects, tasks and priorities.
        </p>

        <div className={`api-status api-status--${apiState.status}`}>
          <span aria-hidden="true" className="status-dot" />
          <span>{apiState.message}</span>
        </div>
      </section>
    </main>
  );
}

export default App;
