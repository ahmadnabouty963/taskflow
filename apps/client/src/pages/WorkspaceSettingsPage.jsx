import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { apiRequest } from "../lib/api.js";

const editableRoles = ["ADMIN", "MEMBER", "VIEWER"];

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentRole, setCurrentRole] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [isAdding, setIsAdding] = useState(false);

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

  const canManage = useMemo(
    () => currentRole === "OWNER" || currentRole === "ADMIN",
    [currentRole],
  );

  async function addMember(event) {
    event.preventDefault();
    setError("");
    setIsAdding(true);
    try {
      const result = await apiRequest(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      setMembers((current) => [...current, result.data.member]);
      setEmail("");
      setRole("MEMBER");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsAdding(false);
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

      {canManage && workspace.type === "TEAM" ? (
        <section className="workspace-settings-card" aria-labelledby="add-member-title">
          <div><p className="eyebrow">Add an existing account</p><h2 id="add-member-title">Add a team member</h2><p>Email invitations with expiring links come in the next release. For now, the person needs an Ordanly account.</p></div>
          <form className="member-add-form" onSubmit={addMember}>
            <label className="form-field"><span>Email address</span><input onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" required type="email" value={email} /></label>
            <label className="form-field"><span>Role</span><select onChange={(event) => setRole(event.target.value)} value={role}>{editableRoles.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select></label>
            <button className="button button--green" disabled={isAdding} type="submit">{isAdding ? "Adding..." : "Add member"}</button>
          </form>
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
