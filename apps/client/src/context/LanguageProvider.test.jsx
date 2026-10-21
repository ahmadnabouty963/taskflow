import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "./auth-context.js";
import { LanguageProvider } from "./LanguageProvider.jsx";
import { useLanguage } from "./language-context.js";

function LanguageProbe() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <span>{language}</span>
      <span>{t("landing.title")}</span>
      <button onClick={() => setLanguage("de")} type="button">Deutsch</button>
    </div>
  );
}

function renderProvider(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    </AuthContext.Provider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "en";
});

describe("LanguageProvider", () => {
  it("switches and stores a guest language", async () => {
    window.localStorage.setItem("ordanly.language.v1", "en");
    const user = userEvent.setup();

    renderProvider({ user: null, updateProfile: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Deutsch" }));

    expect(screen.getByText("de")).toBeInTheDocument();
    expect(screen.getByText("Wissen, was heute wichtig ist.")).toBeInTheDocument();
    expect(window.localStorage.getItem("ordanly.language.v1")).toBe("de");
    expect(document.documentElement.lang).toBe("de");
  });

  it("saves an authenticated language on the account", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderProvider({
      user: { id: "user-1", language: "EN" },
      updateProfile,
    });
    await user.click(screen.getByRole("button", { name: "Deutsch" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ language: "DE" });
    });
  });
});
