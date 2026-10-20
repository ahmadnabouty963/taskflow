import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { apiRequest } from "../lib/api.js";

const editableRoles = ["ADMIN", "MEMBER", "VIEWER"];
const invitationDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [currentRole, setCurrentRole] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvitationId, setPendingInvitationId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSettings() {
      try {
        const [workspaceResult, memberResult] = await Promise.all([
          apiRequest("/api/workspaces", { signal: controller.signal }),
          apiRequest(`/api/workspaces/${workspaceId}/members`, {
            signal: controller.signal,
          }),
        ]);
        setWorkspace(
          workspaceResult.data.workspaces.find(({ id }) => id === workspaceId) ||
            null,
        );
        setMembers(memberResult.data.members);
        setCurrentRole(memberResult.data.currentRole);
        const managerRoles = ["OWNER", "ADMIN"];
        if (
          managerRoles.includes(memberResult.data.currentRole) &&
          workspaceResult.data.workspaces.find(({ id }) => id === workspaceId)?.type === "TEAM"
        ) {
          const invitationResult = await apiRequest(
            `/api/workspaces/${workspaceId}/invitations`,
            { signal: controller.signal },
          );
          setInvitations(invitationResult.data.invitations);
        }
        setStatus("success");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      }
    }
    loadSettings();
    return () => controller.abort();
  }, [workspaceId]);

  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  async function sendInvitation(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsInviting(true);
    try {
      const result = await apiRequest(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      setInvitations((current) => [
        result.data.invitation,
        ...current.filter(({ id }) => id !== result.data.invitation.id),
      ]);
      setEmail("");
      setRole("MEMBER");
      setSuccessMessage(`Invitation sent to ${result.data.invitation.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsInviting(false);
    }
  }

  async function resendInvitation(invitationId) {
    setError("");
    setSuccessMessage("");
    setPendingInvitationId(invitationId);
    try {
      const result = await apiRequest(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
        { method: "POST" },
      );
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === invitationId ? result.data.invitation : invitation,
        ),
      );
      setSuccessMessage(`Invitation resent to ${result.data.invitation.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingInvitationId("");
    }
  }

  async function revokeInvitation(invitationId) {
    setError("");
    setSuccessMessage("");
    setPendingInvitationId(invitationId);
    try {
      await apiRequest(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
        { method: "DELETE" },
      );
      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      setSuccessMessage("Invitation revoked.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingInvitationId("");
    }
  }

  async function updateRole(userId, nextRole) {
    setError("");
    try {
      const result = await apiRequest(
        `/api/workspaces/${workspaceId}/members/${userId}`,
        { method: "PATCH", body: JSON.stringify({ role: nextRole }) },
      );
      setMembers((current) =>
        current.map((member) =>
          member.userId === userId ? result.data.member : member,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeMember(userId) {
    setError("");
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      });
      setMembers((current) => current.filter((member) => member.userId !== userId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (status === "loading") {
    return <main className="workspace-settings-page"><p>Loading workspace...</p></main>;
  }

  if (status === "error" || !workspace) {
    return <main className="workspace-settings-page"><div className="content-error" role="alert"><h1>Workspace unavailable</h1><p>{error || "Workspace not found."}</p><Link to="/app">Back to projects</Link></div></main>;
  }

  return (
    <main className="workspace-settings-page">
      <header className="workspace-settings-header">
        <div><Link className="text-link" to="/app">← Projects</Link><p className="eyebrow">Team settings</p><h1>{workspace.name}</h1><p>{workspace.type === "PERSONAL" ? "Personal workspace" : `Your role: ${currentRole.toLowerCase()}`}</p></div>
      </header>

      {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}
      {successMessage ? <div className="form-message form-message--success" role="status">{successMessage}</div> : null}

      {canManage && workspace.type === "TEAM" ? (
        <section className="workspace-settings-card" aria-labelledby="invite-member-title">
          <div><p className="eyebrow">Team invitation</p><h2 id="invite-member-title">Invite a team member</h2><p>We send a private link that expires after seven days. The person can create an account after opening it.</p></div>
          <form className="member-add-form" onSubmit={sendInvitation}>
            <label className="form-field"><span>Email address</span><input onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" required type="email" value={email} /></label>
            <label className="form-field"><span>Role</span><select onChange={(event) => setRole(event.target.value)} value={role}>{editableRoles.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select></label>
            <button className="button button--green" disabled={isInviting} type="submit">{isInviting ? "Sending..." : "Send invitation"}</button>
          </form>
        </section>
      ) : null}

      {canManage && workspace.type === "TEAM" ? (
        <section className="workspace-settings-card" aria-labelledby="pending-invitations-title">
          <div><p className="eyebrow">Waiting for a response</p><h2 id="pending-invitations-title">Pending invitations</h2><p>Resending creates a new secure link and invalidates the previous one.</p></div>
          {invitations.length > 0 ? (
            <div className="invitation-list">
              {invitations.map((invitation) => (
                <article className="pending-invitation" key={invitation.id}>
                  <div><strong>{invitation.email}</strong><span>{invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()} · expires {invitationDateFormatter.format(new Date(invitation.expiresAt))}</span></div>
                  <div className="pending-invitation__actions">
                    <button disabled={pendingInvitationId === invitation.id} onClick={() => resendInvitation(invitation.id)} type="button">Resend</button>
                    <button className="text-action--danger" disabled={pendingInvitationId === invitation.id} onClick={() => revokeInvitation(invitation.id)} type="button">Revoke</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="empty-inline">No pending invitations.</p>}
        </section>
      ) : null}

      <section className="workspace-settings-card" aria-labelledby="member-list-title">
        <div><p className="eyebrow">Access</p><h2 id="member-list-title">Members</h2><p>Owners control the workspace. Admins manage it. Members edit work. Viewers can only read.</p></div>
        <div className="member-list">
          {members.map((member) => (
            <article className="member-row" key={member.userId}>
              <span className="member-avatar" aria-hidden="true">{member.user.name.charAt(0).toUpperCase()}</span>
              <div><strong>{member.user.name}</strong><span>{member.user.email}</span></div>
              {canManage && member.role !== "OWNER" ? (
                <select aria-label={`Role for ${member.user.name}`} onChange={(event) => updateRole(member.userId, event.target.value)} value={member.role}>{editableRoles.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select>
              ) : <span className="role-badge">{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</span>}
              {canManage && member.role !== "OWNER" ? <button className="member-remove" onClick={() => removeMember(member.userId)} type="button">Remove</button> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
