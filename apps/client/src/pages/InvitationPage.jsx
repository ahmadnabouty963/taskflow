import { BrandLogo } from "../components/BrandLogo.jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";

// Replaces {name} placeholders with React nodes so parts of a translated
// sentence can stay bold.
function withNodes(template, nodes) {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1];
    return name && name in nodes ? <span key={index}>{nodes[name]}</span> : part;
  });
}

export function InvitationPage() {
  const { token } = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { locale, t } = useLanguage();
  const roleLabel = (role) => t(`role.${role}`);
  const location = useLocation();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInvitation() {
      try {
        const result = await apiRequest(`/api/invitations/${token}`, {
          signal: controller.signal,
        });
        setInvitation(result.data.invitation);
        setStatus("ready");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      }
    }

    loadInvitation();
    return () => controller.abort();
  }, [token]);

  async function acceptInvitation() {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await apiRequest(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      localStorage.setItem("ordanly.activeWorkspaceId", result.data.workspace.id);
      navigate("/app", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function declineInvitation() {
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/invitations/${token}/decline`, { method: "POST" });
      setStatus("declined");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const authState = invitation
    ? { from: location.pathname, email: invitation.email }
    : { from: location.pathname };
  const emailMatches =
    user && invitation && user.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <main className="invitation-page">
      <Link aria-label={t("invitation.home")} className="brand" to="/">
        <BrandLogo />
      </Link>

      <section className="invitation-card" aria-live="polite">
        {status === "loading" || isAuthLoading ? (
          <><p className="eyebrow">{t("workspaceSettings.inviteEyebrow")}</p><h1>{t("invitation.loading")}</h1></>
        ) : null}

        {status === "error" ? (
          <><p className="eyebrow">{t("invitation.unavailable")}</p><h1>{t("invitation.unusable")}</h1><p>{error}</p><Link className="button button--dark" to="/">{t("invitation.goHome")}</Link></>
        ) : null}

        {status === "declined" ? (
          <><p className="eyebrow">{t("invitation.declined")}</p><h1>{t("invitation.declinedTitle")}</h1><p>{t("invitation.declinedCopy")}</p><Link className="button button--dark" to="/">{t("invitation.goHome")}</Link></>
        ) : null}

        {status === "ready" && invitation && !isAuthLoading ? (
          <>
            <p className="eyebrow">{t("invitation.eyebrow")}</p>
            <h1>{t("invitation.join", { workspace: invitation.workspace.name })}</h1>
            <p>{withNodes(t("invitation.invitedBy"), { inviter: <strong>{invitation.invitedBy.name}</strong>, email: <strong>{invitation.email}</strong>, role: roleLabel(invitation.role) })}</p>
            <dl className="invitation-summary">
              <div><dt>{t("dashboard.workspace")}</dt><dd>{invitation.workspace.name}</dd></div>
              <div><dt>{t("workspaceSettings.role")}</dt><dd>{roleLabel(invitation.role)}</dd></div>
              <div><dt>{t("invitation.validUntil")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))}</dd></div>
            </dl>

            {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}

            {!user ? (
              <div className="invitation-actions">
                <Link className="button button--dark" state={authState} to="/login">{t("invitation.login")}</Link>
                <Link className="button button--ghost" state={authState} to="/register">{t("invitation.register")}</Link>
                <button className="text-action text-action--danger" disabled={isSubmitting} onClick={declineInvitation} type="button">{t("invitation.declineInvitation")}</button>
              </div>
            ) : null}

            {user && !emailMatches ? (
              <div className="form-message form-message--error" role="alert">{t("invitation.wrongUser", { email: invitation.email, current: user.email })}</div>
            ) : null}

            {emailMatches ? (
              <div className="invitation-actions">
                <button className="button button--green" disabled={isSubmitting} onClick={acceptInvitation} type="button">{isSubmitting ? t("invitation.joining") : t("invitation.accept")}</button>
                <button className="button button--ghost" disabled={isSubmitting} onClick={declineInvitation} type="button">{t("invitation.decline")}</button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
