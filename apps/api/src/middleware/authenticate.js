import prisma from "../lib/prisma.js";
import { hashSessionToken } from "../lib/session.js";

// "Last active" is refreshed at most this often to avoid a write per request.
const ACTIVITY_INTERVAL_MS = 5 * 60 * 1000;

function sendUnauthenticated(response) {
  return response.status(401).json({
    success: false,
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
    },
  });
}

export async function authenticate(request, response, next) {
  try {
    const sessionToken = request.cookies.session_token;

    if (!sessionToken) {
      return sendUnauthenticated(response);
    }

    const tokenHash = hashSessionToken(sessionToken);

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
            language: true,
            isPlatformAdmin: true,
            createdAt: true,
            blockedAt: true,
            lastActiveAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.deleteMany({
          where: {
            id: session.id,
          },
        });
      }

      return sendUnauthenticated(response);
    }

    const { blockedAt, lastActiveAt, ...user } = session.user;

    // Blocking takes effect immediately, even for sessions that already exist.
    if (blockedAt) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      return response.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_BLOCKED",
          message: "This account has been blocked. Please contact support.",
        },
      });
    }

    if (!lastActiveAt || Date.now() - lastActiveAt.getTime() > ACTIVITY_INTERVAL_MS) {
      await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    }

    request.user = user;
    request.session = session;

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePlatformAdmin(request, response, next) {
  if (!request.user?.isPlatformAdmin) {
    return response.status(403).json({
      success: false,
      error: {
        code: "ADMIN_REQUIRED",
        message: "This area is only available to platform administrators.",
      },
    });
  }
  next();
}
