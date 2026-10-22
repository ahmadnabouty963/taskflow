import { Prisma } from "@prisma/client";
import { deleteUserWithFiles } from "../lib/accounts.js";
import prisma from "../lib/prisma.js";

// The admin area shows account metadata and counts only. It never exposes
// what people wrote in their projects, tasks, events or files.
const DAY_MS = 24 * 60 * 60 * 1000;

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  language: true,
  isPlatformAdmin: true,
  emailVerifiedAt: true,
  blockedAt: true,
  createdAt: true,
  lastLoginAt: true,
  lastActiveAt: true,
  lastLoginCountry: true,
  lastLoginDevice: true,
  lastLoginBrowser: true,
  _count: { select: { workspaceMemberships: true, projects: true } },
};

function sendError(response, status, code, message) {
  return response.status(status).json({ success: false, error: { code, message } });
}

function countBy(rows, key) {
  return rows
    .map((row) => ({ value: row[key], count: row._count._all }))
    .sort((first, second) => second.count - first.count);
}

export async function getOverview(request, response, next) {
  try {
    const now = Date.now();
    const since30Days = new Date(now - 30 * DAY_MS);
    const [
      users,
      verifiedUsers,
      blockedUsers,
      active7,
      active30,
      workspaces,
      teamWorkspaces,
      projects,
      tasks,
      events,
      files,
      countries,
      devices,
      signups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { blockedAt: { not: null } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now - 7 * DAY_MS) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: since30Days } } }),
      prisma.workspace.count(),
      prisma.workspace.count({ where: { type: "TEAM" } }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.calendarEvent.count(),
      prisma.attachment.aggregate({ where: { status: "READY" }, _count: { _all: true }, _sum: { size: true } }),
      prisma.user.groupBy({ by: ["lastLoginCountry"], where: { lastLoginCountry: { not: null } }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ["lastLoginDevice"], where: { lastLoginDevice: { not: null } }, _count: { _all: true } }),
      prisma.$queryRaw`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= ${since30Days}
        GROUP BY 1
        ORDER BY 1`,
    ]);

    return response.status(200).json({
      success: true,
      data: {
        users: { total: users, verified: verifiedUsers, blocked: blockedUsers, active7, active30 },
        content: { workspaces, teamWorkspaces, projects, tasks, events },
        storage: { files: files._count._all, bytes: files._sum.size ?? 0 },
        countries: countBy(countries, "lastLoginCountry"),
        devices: countBy(devices, "lastLoginDevice"),
        signups,
      },
    });
  } catch (error) {
    next(error);
  }
}

const statusWhere = {
  all: {},
  active: { blockedAt: null, emailVerifiedAt: { not: null } },
  blocked: { blockedAt: { not: null } },
  unverified: { emailVerifiedAt: null },
  admins: { isPlatformAdmin: true },
};

const sortOrder = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  lastActive: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  name: [{ name: "asc" }],
};

// Storage of the workspaces each user owns, for one page of users.
async function storageByOwner(userIds) {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw`
    SELECT w."ownerId" AS "ownerId", COALESCE(SUM(a."size"), 0)::bigint AS bytes
    FROM "Attachment" a
    JOIN "Workspace" w ON w."id" = a."workspaceId"
    WHERE a."status" = 'READY' AND w."ownerId" IN (${Prisma.join(userIds)})
    GROUP BY w."ownerId"`;
  return new Map(rows.map((row) => [row.ownerId, Number(row.bytes)]));
}

export async function listUsers(request, response, next) {
  try {
    const { search, status, sort, page, limit } = request.validatedQuery;
    const where = {
      ...statusWhere[status],
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: sortOrder[sort],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    const storage = await storageByOwner(users.map(({ id }) => id));

    return response.status(200).json({
      success: true,
      data: {
        users: users.map(({ _count, ...user }) => ({
          ...user,
          workspaces: _count.workspaceMemberships,
          projects: _count.projects,
          storageBytes: storage.get(user.id) ?? 0,
          isCurrentUser: user.id === request.user.id,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
}

// Admins cannot lock themselves out or act against other administrators;
// removing an admin has to happen deliberately through the grant script.
async function findManageableUser(request, response) {
  const target = await prisma.user.findUnique({
    where: { id: request.validatedParams.userId },
    select: { id: true, email: true, isPlatformAdmin: true },
  });

  if (!target) {
    sendError(response, 404, "USER_NOT_FOUND", "User not found.");
    return null;
  }

  if (target.id === request.user.id) {
    sendError(response, 422, "CANNOT_MANAGE_SELF", "You cannot block or delete your own account here.");
    return null;
  }

  if (target.isPlatformAdmin) {
    sendError(response, 422, "CANNOT_MANAGE_ADMIN", "Other administrators cannot be blocked or deleted.");
    return null;
  }

  return target;
}

export async function updateUser(request, response, next) {
  try {
    const target = await findManageableUser(request, response);
    if (!target) return;

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { blockedAt: request.body.blocked ? new Date() : null },
      select: { id: true, blockedAt: true },
    });

    if (request.body.blocked) {
      await prisma.session.deleteMany({ where: { userId: target.id } });
    }

    return response.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(request, response, next) {
  try {
    const target = await findManageableUser(request, response);
    if (!target) return;

    if (request.body.confirmEmail !== target.email.toLowerCase()) {
      return sendError(response, 422, "CONFIRMATION_MISMATCH", "The email address does not match this account.");
    }

    await deleteUserWithFiles(target.id);
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
