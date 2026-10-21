import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LanguageContext } from "../context/language-context.js";
import { createLanguageValue } from "../test/language.js";
import { LandingPage } from "./LandingPage.jsx";

function renderLandingPage(authValue, language = "en") {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <LanguageContext.Provider value={createLanguageValue(language)}>
          <LandingPage />
        </LanguageContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  it("shows login and registration links for a guest", () => {
    renderLandingPage({
      user: null,
      isLoading: false,
    });

    expect(
      screen.getByRole("heading", {
        name: /know what matters today/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );

    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows the product homepage in German", () => {
    renderLandingPage({ user: null, isLoading: false }, "de");

    expect(
      screen.getByRole("heading", { name: /wissen, was heute wichtig ist/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/task manager/i)).toBeInTheDocument();
    expect(screen.getByText(/projektfristen und termine/i)).toBeInTheDocument();
  });

  it("shows the workspace link for an authenticated user", () => {
    renderLandingPage({
      user: {
        id: "user-1",
        name: "Ahmad",
        email: "ahmad@example.com",
      },
      isLoading: false,
    });

    expect(
      screen.getByRole("link", { name: "Open workspace" }),
    ).toHaveAttribute("href", "/app");

    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
  });
});
