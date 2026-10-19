import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LandingPage } from "./LandingPage.jsx";

function renderLandingPage(authValue) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <LandingPage />
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
        name: /make the next step unmistakably clear/i,
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
