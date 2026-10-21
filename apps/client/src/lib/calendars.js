const writeRoles = ["OWNER", "ADMIN", "MEMBER"];
const manageRoles = ["OWNER", "ADMIN"];

export function calendarName(workspace) {
  if (!workspace) return "";
  return workspace.type === "PERSONAL" ? "Personal" : workspace.name;
}

export function writableCalendars(workspaces) {
  return workspaces.filter((workspace) => writeRoles.includes(workspace.role));
}

export function isSharedEvent(event) {
  return Boolean(event.workspace) && event.workspace.type !== "PERSONAL";
}

// Mirrors the API rule: creators edit their own events, owners and admins
// edit every event in their calendar.
export function canEditEvent(event, userId, workspaces) {
  const role = workspaces.find(
    (workspace) => workspace.id === event.workspaceId,
  )?.role;

  if (!role) return event.ownerId === userId;
  if (!writeRoles.includes(role)) return false;
  return event.ownerId === userId || manageRoles.includes(role);
}
