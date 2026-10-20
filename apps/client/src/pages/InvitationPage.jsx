import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

function roleLabel(role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function InvitationPage() {
  const { token } = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
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
      <Link aria-label="Ordanly home" className="brand" to="/">
        <span className="brand-logo">O</span>
        <span>Ordanly</span>
      </Link>

      <section className="invitation-card" aria-live="polite">
        {status === "loading" || isAuthLoading ? (
          <><p className="eyebrow">Team invitation</p><h1>Loading invitation...</h1></>
        ) : null}

        {status === "error" ? (
          <><p className="eyebrow">Invitation unavailable</p><h1>This link cannot be used.</h1><p>{error}</p><Link className="button button--dark" to="/">Go to Ordanly</Link></>
        ) : null}

        {status === "declined" ? (
          <><p className="eyebrow">Invitation declined</p><h1>No workspace was added.</h1><p>You can close this page. If this was a mistake, ask the workspace owner for a new invitation.</p><Link className="button button--dark" to="/">Go to Ordanly</Link></>
        ) : null}

        {status === "ready" && invitation && !isAuthLoading ? (
          <>
            <p className="eyebrow">You are invited</p>
            <h1>Join {invitation.workspace.name}</h1>
            <p><strong>{invitation.invitedBy.name}</strong> invited <strong>{invitation.email}</strong> to collaborate as {roleLabel(invitation.role)}.</p>
            <dl className="invitation-summary">
              <div><dt>Workspace</dt><dd>{invitation.workspace.name}</dd></div>
              <div><dt>Role</dt><dd>{roleLabel(invitation.role)}</dd></div>
              <div><dt>Valid until</dt><dd>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))}</dd></div>
            </dl>

            {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}

            {!user ? (
              <div className="invitation-actions">
                <Link className="button button--dark" state={authState} to="/login">Log in to accept</Link>
                <Link className="button button--ghost" state={authState} to="/register">Create account</Link>
                <button className="text-action text-action--danger" disabled={isSubmitting} onClick={declineInvitation} type="button">Decline invitation</button>
              </div>
            ) : null}

            {user && !emailMatches ? (
              <div className="form-message form-message--error" role="alert">This invitation belongs to {invitation.email}. You are logged in as {user.email}.</div>
            ) : null}

            {emailMatches ? (
              <div className="invitation-actions">
                <button className="button button--green" disabled={isSubmitting} onClick={acceptInvitation} type="button">{isSubmitting ? "Joining..." : "Accept invitation"}</button>
                <button className="button button--ghost" disabled={isSubmitting} onClick={declineInvitation} type="button">Decline</button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
