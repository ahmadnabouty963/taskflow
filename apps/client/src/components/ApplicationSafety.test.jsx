import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { PageTitle } from "./PageTitle.jsx";

function BrokenComponent() {
  throw new Error("Test application error");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Application safety", () => {
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
      <MemoryRouter initialEntries={["/login"]}>
        <PageTitle />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Log in — Ordanly");
    });
  });
});
