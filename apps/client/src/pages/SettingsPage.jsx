import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/auth-context.js";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsPage() {
  const {
    user,
    updateProfile,
    changePassword,
    logoutOtherSessions,
    deleteAccount,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [profileStatus, setProfileStatus] = useState({
    type: "",
    message: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState(emptyPasswordForm);
  const [passwordStatus, setPasswordStatus] = useState({
    type: "",
    message: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessionsStatus, setSessionsStatus] = useState({
    type: "",
    message: "",
  });
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.title = "Account settings — Ordanly";
  }, []);

  useEffect(() => {
    if (!deleteDialogOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isDeleting) {
        setDeleteDialogOpen(false);
        setDeletePassword("");
        setDeleteError("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [deleteDialogOpen, isDeleting]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileStatus({ type: "", message: "" });

    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setProfileStatus({
        type: "error",
        message: "Name must contain at least 2 characters.",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({ name: normalizedName });
      setName(normalizedName);
      setProfileStatus({
        type: "success",
        message: "Profile updated successfully.",
      });
    } catch (error) {
      setProfileStatus({ type: "error", message: error.message });
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handlePasswordInput(event) {
    const { name: fieldName, value } = event.target;

    setPasswords((currentPasswords) => ({
      ...currentPasswords,
      [fieldName]: value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordStatus({ type: "", message: "" });

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "The new passwords do not match.",
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: "The new password must contain at least 8 characters.",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords(emptyPasswordForm);
      setPasswordStatus({
        type: "success",
        message: "Password changed. Other devices have been signed out.",
      });
    } catch (error) {
      setPasswordStatus({ type: "error", message: error.message });
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogoutOtherSessions() {
    setSessionsStatus({ type: "", message: "" });
    setIsLoggingOutOthers(true);

    try {
      const deletedSessions = await logoutOtherSessions();
      setSessionsStatus({
        type: "success",
        message:
          deletedSessions === 0
            ? "No other active sessions were found."
            : `Signed out ${deletedSessions} other session${
                deletedSessions === 1 ? "" : "s"
              }.`,
      });
    } catch (error) {
      setSessionsStatus({ type: "error", message: error.message });
    } finally {
      setIsLoggingOutOthers(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setSessionsStatus({ type: "error", message: error.message });
      setIsLoggingOut(false);
    }
  }

  function closeDeleteDialog() {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDeleteAccount(event) {
    event.preventDefault();
    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteAccount(deletePassword);
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div>
          <Link className="workspace-brand" to="/">
            <span className="brand-logo brand-logo--light">O</span>
            <span>Ordanly</span>
          </Link>

          <nav className="workspace-nav" aria-label="Workspace navigation">
            <Link className="workspace-nav__item" to="/app">
              Projects
            </Link>
            <Link className="workspace-nav__item" to="/app/today">
              Today
            </Link>
            <Link className="workspace-nav__item" to="/app/upcoming">
              Upcoming
            </Link>
            <Link className="workspace-nav__item" to="/app/calendar">
              Calendar
            </Link>
            <Link
              className="workspace-nav__item workspace-nav__item--active"
              to="/app/settings"
            >
              Settings
            </Link>
          </nav>
        </div>

        <div className="workspace-user">
          <span className="user-avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>

          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <button
            className="logout-button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="workspace-main settings-main">
        <header className="workspace-header settings-header">
          <div>
            <p className="eyebrow">Personal settings</p>
            <h1>Account</h1>
            <p className="settings-header__copy">
              Keep your profile, password and active sessions under control.
            </p>
          </div>
        </header>

        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="profile-title">
            <header>
              <p className="eyebrow">Profile</p>
              <h2 id="profile-title">Personal information</h2>
              <p>Your email address is used to identify your account.</p>
            </header>

            <form className="settings-form" onSubmit={handleProfileSubmit}>
              <label className="form-field">
                <span>Name</span>
                <input
                  autoComplete="name"
                  maxLength="80"
                  minLength="2"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </label>

              <label className="form-field">
                <span>Email</span>
                <input disabled type="email" value={user.email} />
                <small>Email changes are not available yet.</small>
              </label>

              {profileStatus.message && (
                <div
                  className={`form-message form-message--${profileStatus.type}`}
                  role="status"
                >
                  {profileStatus.message}
                </div>
              )}

              <div className="settings-actions">
                <button
                  className="button button--dark"
                  disabled={isSavingProfile || name.trim() === user.name}
                  type="submit"
                >
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="password-title">
            <header>
              <p className="eyebrow">Security</p>
              <h2 id="password-title">Change password</h2>
              <p>Use at least 8 characters and avoid reused passwords.</p>
            </header>

            <form className="settings-form" onSubmit={handlePasswordSubmit}>
              <label className="form-field">
                <span>Current password</span>
                <input
                  autoComplete="current-password"
                  name="currentPassword"
                  onChange={handlePasswordInput}
                  required
                  type="password"
                  value={passwords.currentPassword}
                />
              </label>

              <label className="form-field">
                <span>New password</span>
                <input
                  autoComplete="new-password"
                  minLength="8"
                  name="newPassword"
                  onChange={handlePasswordInput}
                  required
                  type="password"
                  value={passwords.newPassword}
                />
              </label>

              <label className="form-field">
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  minLength="8"
                  name="confirmPassword"
                  onChange={handlePasswordInput}
                  required
                  type="password"
                  value={passwords.confirmPassword}
                />
              </label>

              {passwordStatus.message && (
                <div
                  className={`form-message form-message--${passwordStatus.type}`}
                  role={passwordStatus.type === "error" ? "alert" : "status"}
                >
                  {passwordStatus.message}
                </div>
              )}

              <div className="settings-actions">
                <button
                  className="button button--dark"
                  disabled={isChangingPassword}
                  type="submit"
                >
                  {isChangingPassword ? "Changing..." : "Change password"}
                </button>
              </div>
            </form>
          </section>

          <section
            className="settings-card settings-card--wide"
            aria-labelledby="sessions-title"
          >
            <header>
              <p className="eyebrow">Sessions</p>
              <h2 id="sessions-title">Signed-in devices</h2>
              <p>
                End every other active session while keeping this device signed
                in.
              </p>
            </header>

            {sessionsStatus.message && (
              <div
                className={`form-message form-message--${sessionsStatus.type}`}
                role={sessionsStatus.type === "error" ? "alert" : "status"}
              >
                {sessionsStatus.message}
              </div>
            )}

            <div className="settings-action-row">
              <div>
                <strong>Other sessions</strong>
                <span>Your current browser will remain connected.</span>
              </div>
              <button
                className="button button--ghost"
                disabled={isLoggingOutOthers}
                onClick={handleLogoutOtherSessions}
                type="button"
              >
                {isLoggingOutOthers
                  ? "Signing out..."
                  : "Log out other devices"}
              </button>
            </div>
          </section>

          <section
            className="settings-card settings-card--wide settings-card--danger"
            aria-labelledby="danger-title"
          >
            <header>
              <p className="eyebrow eyebrow--danger">Danger zone</p>
              <h2 id="danger-title">Delete account</h2>
              <p>
                Permanently remove your account, projects and tasks. This cannot
                be undone.
              </p>
            </header>

            <div className="settings-action-row">
              <div>
                <strong>Permanent deletion</strong>
                <span>Your password is required before deletion.</span>
              </div>
              <button
                className="button button--danger"
                onClick={() => setDeleteDialogOpen(true)}
                type="button"
              >
                Delete account
              </button>
            </div>
          </section>
        </div>
      </main>

      {deleteDialogOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog();
            }
          }}
        >
          <section
            aria-labelledby="delete-account-title"
            aria-modal="true"
            className="dialog-card dialog-card--small"
            role="dialog"
          >
            <header className="dialog-header">
              <div>
                <p className="eyebrow eyebrow--danger">Permanent action</p>
                <h2 id="delete-account-title">Delete your account?</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="dialog-close"
                disabled={isDeleting}
                onClick={closeDeleteDialog}
                type="button"
              >
                ×
              </button>
            </header>

            <p className="dialog-message">
              All projects and tasks will be removed permanently. Enter your
              password to confirm.
            </p>

            <form className="dialog-form" onSubmit={handleDeleteAccount}>
              <label className="form-field">
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setDeletePassword(event.target.value)}
                  required
                  type="password"
                  value={deletePassword}
                />
              </label>

              {deleteError && (
                <div className="form-message form-message--error" role="alert">
                  {deleteError}
                </div>
              )}

              <footer className="dialog-actions">
                <button
                  className="button button--ghost"
                  disabled={isDeleting}
                  onClick={closeDeleteDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button button--danger"
                  disabled={isDeleting || !deletePassword}
                  type="submit"
                >
                  {isDeleting ? "Deleting..." : "Delete permanently"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
