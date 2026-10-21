import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { PageTitle } from "./PageTitle.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { LanguageContext } from "../context/language-context.js";
import { createLanguageValue } from "../test/language.js";

function BrokenComponent() {
  throw new Error("Test application error");
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("Application safety", () => {
  function withLanguage(component) {
    return (
      <LanguageContext.Provider value={createLanguageValue()}>
        {component}
      </LanguageContext.Provider>
    );
  }

  it("shows a safe fallback when React cannot render", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Something went wrong.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Reload application",
      }),
    ).toBeInTheDocument();
  });

  it("updates the browser title for the current page", async () => {
    render(
      withLanguage(
        <MemoryRouter initialEntries={["/login"]}>
          <PageTitle />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.title).toBe("Log in — Ordanly");
    });
  });

  it("switches and remembers the visual theme", async () => {
    const user = userEvent.setup();

    render(withLanguage(<ThemeToggle />));

    const toggle = screen.getByRole("button", {
      name: "Switch to dark mode",
    });

    await user.click(toggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("ordanly.theme.v1")).toBe("dark");

    expect(
      screen.getByRole("button", {
        name: "Switch to light mode",
      }),
    ).toBeInTheDocument();
  });
});
