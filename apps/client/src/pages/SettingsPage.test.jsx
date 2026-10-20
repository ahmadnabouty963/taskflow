import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage.jsx";

const auth = {
  user: {
    id: "user-1",
    name: "Ahmad Nabouti",
    email: "ahmad@example.com",
  },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  logoutOtherSessions: vi.fn(),
  deleteAccount: vi.fn(),
  logout: vi.fn(),
};

vi.mock("../context/auth-context.js", () => ({
  useAuth: () => auth,
}));

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = {
    id: "user-1",
    name: "Ahmad Nabouti",
    email: "ahmad@example.com",
  };
  auth.updateProfile.mockReset().mockResolvedValue(auth.user);
  auth.changePassword.mockReset().mockResolvedValue(undefined);
  auth.logoutOtherSessions.mockReset().mockResolvedValue(2);
  auth.deleteAccount.mockReset().mockResolvedValue(undefined);
  auth.logout.mockReset().mockResolvedValue(undefined);
});

describe("Account settings", () => {
  it("updates the profile name", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Ahmad Nabouti Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(auth.updateProfile).toHaveBeenCalledWith({
      name: "Ahmad Nabouti Updated",
    });
    expect(
      await screen.findByText("Profile updated successfully."),
    ).toBeInTheDocument();
  });

  it("does not submit different new passwords", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.type(screen.getByLabelText("Current password"), "Current123");
    await user.type(screen.getByLabelText("New password"), "NewSecret123");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "Different123",
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(
      screen.getByText("The new passwords do not match."),
    ).toBeInTheDocument();
  });

  it("changes the password and clears the fields", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    const currentPassword = screen.getByLabelText("Current password");
    const newPassword = screen.getByLabelText("New password");
    const confirmPassword = screen.getByLabelText("Confirm new password");

    await user.type(currentPassword, "Current123");
    await user.type(newPassword, "NewSecret123");
    await user.type(confirmPassword, "NewSecret123");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: "Current123",
      newPassword: "NewSecret123",
    });
    expect(
      await screen.findByText(
        "Password changed. Other devices have been signed out.",
      ),
    ).toBeInTheDocument();
    expect(currentPassword).toHaveValue("");
    expect(newPassword).toHaveValue("");
    expect(confirmPassword).toHaveValue("");
  });

  it("logs out other sessions", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(
      screen.getByRole("button", { name: "Log out other devices" }),
    );

    expect(auth.logoutOtherSessions).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Signed out 2 other sessions.")).toBeInTheDocument();
  });

  it("requires the password in the deletion dialog", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const dialog = screen.getByRole("dialog", {
      name: "Delete your account?",
    });
    const deleteButton = within(dialog).getByRole("button", {
      name: "Delete permanently",
    });

    expect(deleteButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText("Password"), "Secret123");
    await user.click(deleteButton);

    expect(auth.deleteAccount).toHaveBeenCalledWith("Secret123");
  });
});
