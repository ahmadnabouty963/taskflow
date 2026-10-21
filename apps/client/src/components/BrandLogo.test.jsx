import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo.jsx";

describe("Ordanly brand", () => {
  it("provides light and dark wordmarks with an accessible name", () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByRole("img", { name: "Ordanly" })).toBeInTheDocument();
    const images = [...container.querySelectorAll("img")];
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      "/ordanly-logo.svg",
      "/ordanly-logo-dark.svg",
    ]);
  });
});
