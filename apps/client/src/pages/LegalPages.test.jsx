import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ImpressumPage } from "./ImpressumPage.jsx";
import { PrivacyPage } from "./PrivacyPage.jsx";

function renderPage(page) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("Legal pages", () => {
  it("shows the provider and project status in the Impressum", () => {
    renderPage(<ImpressumPage />);

    expect(
      screen.getByRole("heading", { name: "Impressum" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Ahmad Nabouti")).toHaveLength(2);

    expect(
      screen.getByText(/non-commercial educational graduation project/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "hello@ordanly.com" }),
    ).toHaveAttribute("href", "mailto:hello@ordanly.com");
  });

  it("documents the application's actual data processing", () => {
    renderPage(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Vercel bereitgestellt/i)).toBeInTheDocument();
    expect(screen.getByText(/keine Webanalyse/i)).toBeInTheDocument();
    expect(screen.getByText(/HttpOnly, Secure/i)).toBeInTheDocument();
  });
});
