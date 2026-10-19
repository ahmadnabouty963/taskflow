import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";
import { AuthContext } from "./auth-context.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        const result = await apiRequest("/api/auth/me", {
          signal: controller.signal,
        });

        setUser(result.data.user);
      } catch (error) {
        if (error.name !== "AbortError") {
          setUser(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      controller.abort();
    };
  }, []);

  async function login(credentials) {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    setUser(result.data.user);
    return result.data.user;
  }

  async function register(account) {
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(account),
    });

    return login({
      email: account.email,
      password: account.password,
    });
  }

  async function logout() {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });

    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
