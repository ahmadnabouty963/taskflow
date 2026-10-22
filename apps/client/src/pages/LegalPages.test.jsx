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

    const heading = screen.getByRole("heading", {
      name: "Datenschutzerklärung",
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("legal-title--long");

    expect(screen.getByText(/Vercel bereitgestellt/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Besucherstatistik ohne Cookies/i })).toBeInTheDocument();
    expect(screen.getByText(/keine Analysedienste Dritter/i)).toBeInTheDocument();
    expect(screen.getByText(/HttpOnly, Secure/i)).toBeInTheDocument();
  });
});
