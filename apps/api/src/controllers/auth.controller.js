import argon2 from "argon2";
import prisma from "../lib/prisma.js";
import { createSessionToken, hashSessionToken } from "../lib/session.js";
export async function register(request, response, next) {
  try {
    const { name, email, password } = request.body;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return response.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        },
      });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return response.status(201).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function login(request, response, next) {
  try {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const credentialsAreValid =
      user && (await argon2.verify(user.passwordHash, password));

    if (!credentialsAreValid) {
      return response.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        },
      });
    }

    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    response.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
export function getCurrentUser(request, response) {
  return response.status(200).json({
    success: true,
    data: {
      user: request.user,
    },
  });
}
export async function logout(request, response, next) {
  try {
    await prisma.session.deleteMany({
      where: {
        id: request.session.id,
      },
    });

    response.clearCookie("session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
