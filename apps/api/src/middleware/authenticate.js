import prisma from "../lib/prisma.js";
import { hashSessionToken } from "../lib/session.js";

export async function authenticate(request, response, next) {
  try {
    const sessionToken = request.cookies.session_token;

    if (!sessionToken) {
      return response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
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
            createdAt: true,
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

      return response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    request.user = session.user;
    request.session = session;

    next();
  } catch (error) {
    next(error);
  }
}
