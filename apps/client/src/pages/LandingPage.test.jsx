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

  it("lists every feature, including the newer ones, in both languages", () => {
    const { unmount } = renderLandingPage({ user: null, isLoading: false });
    const features = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

    expect(features).toEqual(expect.arrayContaining([
      "Project whiteboards",
      "Files and attachments",
      "Shared calendars",
      "Today and Upcoming",
      "Invitations by email",
      "Phone, dark mode and two languages",
    ]));
    expect(document.querySelectorAll(".landing-feature-grid article")).toHaveLength(12);
    unmount();

    renderLandingPage({ user: null, isLoading: false }, "de");
    expect(screen.getByRole("heading", { name: "Whiteboard für Projekte" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gemeinsame Kalender" })).toBeInTheDocument();
    expect(screen.queryByText(/landing\.feature\./)).not.toBeInTheDocument();
  });
});
