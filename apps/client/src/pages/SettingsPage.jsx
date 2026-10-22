import { AppNavigation } from "../components/AppNavigation.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { useLanguage } from "../context/language-context.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.jsx";

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
  const { language, t } = useLanguage();
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
        message: t("settings.nameTooShort"),
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({ name: normalizedName });
      setName(normalizedName);
      setProfileStatus({
        type: "success",
        message: t("settings.profileSaved"),
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
        message: t("settings.passwordMismatch"),
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: t("settings.passwordTooShort"),
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
        message: t("settings.passwordChanged"),
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
            ? t("settings.noOtherSessions")
            : t(
                deletedSessions === 1
                  ? "settings.signedOutOthers.one"
                  : "settings.signedOutOthers.other",
                { count: deletedSessions },
              ),
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
      <AppNavigation active="settings" onLogoutError={(message) => setSessionsStatus({ type: "error", message })} />

      <main className="workspace-main settings-main">
        <header className="workspace-header settings-header">
          <div>
            <p className="eyebrow">{t("settings.eyebrow")}</p>
            <h1>{t("settings.title")}</h1>
            <p className="settings-header__copy">
              {t("settings.copy")}
            </p>
          </div>
        </header>

        <div className="settings-grid">
          {user.isPlatformAdmin && (
            <section className="settings-card settings-card--wide" aria-labelledby="admin-link-title">
              <header>
                <p className="eyebrow">{t("admin.eyebrow")}</p>
                <h2 id="admin-link-title">{t("admin.title")}</h2>
                <p>{t("admin.settingsCopy")}</p>
              </header>
              <Link className="button button--dark" to="/app/admin">{t("admin.open")}</Link>
            </section>
          )}

          <section className="settings-card settings-card--language" aria-labelledby="language-title">
            <header>
              <p className="eyebrow">{t("settings.language.eyebrow")}</p>
              <h2 id="language-title">{t("settings.language.title")}</h2>
              <p>{t("settings.language.copy")}</p>
            </header>
            <div className="settings-language-control">
              <LanguageSwitcher compact />
              <span>{language === "de" ? t("language.german") : t("language.english")}</span>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="profile-title">
            <header>
              <p className="eyebrow">{t("settings.profileEyebrow")}</p>
              <h2 id="profile-title">{t("settings.profileTitle")}</h2>
              <p>{t("settings.profileCopy")}</p>
            </header>

            <form className="settings-form" onSubmit={handleProfileSubmit}>
              <label className="form-field">
                <span>{t("settings.name")}</span>
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
                <span>{t("settings.email")}</span>
                <input disabled type="email" value={user.email} />
                <small>{t("settings.emailLocked")}</small>
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
                  {isSavingProfile ? t("common.saving") : t("common.saveChanges")}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="password-title">
            <header>
              <p className="eyebrow">{t("settings.securityEyebrow")}</p>
              <h2 id="password-title">{t("settings.passwordTitle")}</h2>
              <p>{t("settings.passwordCopy")}</p>
            </header>

            <form className="settings-form" onSubmit={handlePasswordSubmit}>
              <label className="form-field">
                <span>{t("settings.currentPassword")}</span>
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
                <span>{t("settings.newPassword")}</span>
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
                <span>{t("settings.confirmPassword")}</span>
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
                  {isChangingPassword ? t("settings.changing") : t("settings.passwordTitle")}
                </button>
              </div>
            </form>
          </section>

          <section
            className="settings-card settings-card--wide"
            aria-labelledby="sessions-title"
          >
            <header>
              <p className="eyebrow">{t("settings.sessionsEyebrow")}</p>
              <h2 id="sessions-title">{t("settings.sessionsTitle")}</h2>
              <p>{t("settings.sessionsCopy")}</p>
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
                <strong>{t("settings.otherSessions")}</strong>
                <span>{t("settings.otherSessionsCopy")}</span>
              </div>
              <button
                className="button button--ghost"
                disabled={isLoggingOutOthers}
                onClick={handleLogoutOtherSessions}
                type="button"
              >
                {isLoggingOutOthers
                  ? t("settings.signingOut")
                  : t("settings.logoutOthers")}
              </button>
            </div>

            <div className="settings-action-row">
              <div>
                <strong>{t("settings.thisDevice")}</strong>
                <span>{t("settings.thisDeviceCopy")}</span>
              </div>
              <button
                className="button button--ghost"
                disabled={isLoggingOut}
                onClick={handleLogout}
                type="button"
              >
                {isLoggingOut ? t("settings.signingOut") : t("settings.logoutThis")}
              </button>
            </div>
          </section>

          <section
            className="settings-card settings-card--wide settings-card--danger"
            aria-labelledby="danger-title"
          >
            <header>
              <p className="eyebrow eyebrow--danger">{t("settings.dangerEyebrow")}</p>
              <h2 id="danger-title">{t("settings.deleteTitle")}</h2>
              <p>{t("settings.deleteCopy")}</p>
            </header>

            <div className="settings-action-row">
              <div>
                <strong>{t("settings.permanent")}</strong>
                <span>{t("settings.permanentCopy")}</span>
              </div>
              <button
                className="button button--danger"
                onClick={() => setDeleteDialogOpen(true)}
                type="button"
              >
                {t("settings.deleteTitle")}
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
                <p className="eyebrow eyebrow--danger">{t("settings.permanentAction")}</p>
                <h2 id="delete-account-title">{t("settings.deleteQuestion")}</h2>
              </div>
              <button
                aria-label={t("common.closeDialog")}
                className="dialog-close"
                disabled={isDeleting}
                onClick={closeDeleteDialog}
                type="button"
              >
                ×
              </button>
            </header>

            <p className="dialog-message">
              {t("settings.deleteDialogCopy")}
            </p>

            <form className="dialog-form" onSubmit={handleDeleteAccount}>
              <label className="form-field">
                <span>{t("common.password")}</span>
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
                  {t("common.cancel")}
                </button>
                <button
                  className="button button--danger"
                  disabled={isDeleting || !deletePassword}
                  type="submit"
                >
                  {isDeleting ? t("common.deleting") : t("settings.deletePermanently")}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
