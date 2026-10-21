import argon2 from "argon2";
import prisma from "../lib/prisma.js";
import {
  createAuthToken,
  getAuthTokenExpiry,
  hashAuthToken,
} from "../lib/auth-token.js";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../lib/email.js";
import { createSessionToken, hashSessionToken } from "../lib/session.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  createdAt: true,
};

async function issueAuthToken(transaction, userId, type) {
  const token = createAuthToken();
  const record = await transaction.authToken.create({
    data: {
      tokenHash: hashAuthToken(token),
      type,
      userId,
      expiresAt: getAuthTokenExpiry(type),
    },
  });
  return { token, record };
}

function sendTokenUnavailable(response) {
  return response.status(410).json({
    success: false,
    error: {
      code: "TOKEN_UNAVAILABLE",
      message: "This link is invalid, expired or has already been used.",
    },
  });
}

function sendAccepted(response, message) {
  return response.status(202).json({ success: true, data: { message } });
}

export async function register(request, response, next) {
  try {
    const { name, email, password } = request.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return response.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        },
      });
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerifiedAt: process.env.NODE_ENV === "test" ? new Date() : null,
        },
        select: publicUserSelect,
      });
      await transaction.workspace.create({
        data: {
          name: `${user.name}'s workspace`,
          type: "PERSONAL",
          ownerId: user.id,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });
      const authToken = await issueAuthToken(
        transaction,
        user.id,
        "EMAIL_VERIFICATION",
      );
      return { user, authToken };
    });

    try {
      await sendEmailVerificationEmail({
        tokenId: result.authToken.record.id,
        token: result.authToken.token,
        email: result.user.email,
        name: result.user.name,
      });
    } catch (emailError) {
      await prisma.user.deleteMany({ where: { id: result.user.id } });
      return response.status(502).json({
        success: false,
        error: {
          code: "VERIFICATION_EMAIL_FAILED",
          message: "The verification email could not be sent. Please try again.",
        },
      });
    }

    return response.status(201).json({
      success: true,
      data: {
        user: result.user,
        message: "Check your inbox to verify your email address.",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const { email, password } = request.body;
    const user = await prisma.user.findUnique({ where: { email } });
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
    if (!user.emailVerifiedAt) {
      return response.status(403).json({
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Verify your email address before logging in.",
        },
      });
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        tokenHash: hashSessionToken(sessionToken),
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
          emailVerifiedAt: user.emailVerifiedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(request, response, next) {
  try {
    const tokenHash = hashAuthToken(request.body.token);
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: "EMAIL_VERIFICATION",
        expiresAt: { gt: new Date() },
      },
    });
    if (!authToken) return sendTokenUnavailable(response);

    const user = await prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authToken.deleteMany({
        where: {
          id: authToken.id,
          tokenHash,
          type: "EMAIL_VERIFICATION",
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) return null;

      const verifiedUser = await transaction.user.update({
        where: { id: authToken.userId },
        data: { emailVerifiedAt: new Date() },
        select: publicUserSelect,
      });
      await transaction.authToken.deleteMany({
        where: { userId: authToken.userId, type: "EMAIL_VERIFICATION" },
      });
      return verifiedUser;
    });
    if (!user) return sendTokenUnavailable(response);
    return response.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function resendVerification(request, response, next) {
  try {
    const user = await prisma.user.findUnique({ where: { email: request.body.email } });
    if (user && !user.emailVerifiedAt) {
      const authToken = await prisma.$transaction(async (transaction) => {
        await transaction.authToken.deleteMany({
          where: { userId: user.id, type: "EMAIL_VERIFICATION" },
        });
        return issueAuthToken(transaction, user.id, "EMAIL_VERIFICATION");
      });
      try {
        await sendEmailVerificationEmail({
          tokenId: authToken.record.id,
          token: authToken.token,
          email: user.email,
          name: user.name,
        });
      } catch (emailError) {
        await prisma.authToken.deleteMany({ where: { id: authToken.record.id } });
      }
    }
    return sendAccepted(
      response,
      "If this address needs verification, a new link has been sent.",
    );
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(request, response, next) {
  try {
    const user = await prisma.user.findUnique({ where: { email: request.body.email } });
    if (user) {
      const authToken = await prisma.$transaction(async (transaction) => {
        await transaction.authToken.deleteMany({
          where: { userId: user.id, type: "PASSWORD_RESET" },
        });
        return issueAuthToken(transaction, user.id, "PASSWORD_RESET");
      });
      try {
        await sendPasswordResetEmail({
          tokenId: authToken.record.id,
          token: authToken.token,
          email: user.email,
          name: user.name,
        });
      } catch (emailError) {
        await prisma.authToken.deleteMany({ where: { id: authToken.record.id } });
      }
    }
    return sendAccepted(
      response,
      "If an account exists for this address, a reset link has been sent.",
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(request, response, next) {
  try {
    const tokenHash = hashAuthToken(request.body.token);
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: "PASSWORD_RESET",
        expiresAt: { gt: new Date() },
      },
    });
    if (!authToken) return sendTokenUnavailable(response);

    const passwordHash = await argon2.hash(request.body.newPassword, {
      type: argon2.argon2id,
    });
    const passwordWasReset = await prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authToken.deleteMany({
        where: {
          id: authToken.id,
          tokenHash,
          type: "PASSWORD_RESET",
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) return false;

      await transaction.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      });
      await transaction.session.deleteMany({ where: { userId: authToken.userId } });
      await transaction.authToken.deleteMany({ where: { userId: authToken.userId } });
      return true;
    });
    if (!passwordWasReset) return sendTokenUnavailable(response);
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export function getCurrentUser(request, response) {
  return response.status(200).json({ success: true, data: { user: request.user } });
}

export async function logout(request, response, next) {
  try {
    await prisma.session.deleteMany({ where: { id: request.session.id } });
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

export async function updateProfile(request, response, next) {
  try {
    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: { name: request.body.name },
      select: publicUserSelect,
    });
    return response.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(request, response, next) {
  try {
    const { currentPassword, newPassword } = request.body;
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const passwordIsValid =
      user && (await argon2.verify(user.passwordHash, currentPassword));
    if (!passwordIsValid) {
      return response.status(401).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "Current password is incorrect." },
      });
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await prisma.$transaction([
      prisma.user.update({ where: { id: request.user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({
        where: { userId: request.user.id, id: { not: request.session.id } },
      }),
      prisma.authToken.deleteMany({ where: { userId: request.user.id } }),
    ]);
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function logoutOtherSessions(request, response, next) {
  try {
    const result = await prisma.session.deleteMany({
      where: { userId: request.user.id, id: { not: request.session.id } },
    });
    return response.status(200).json({
      success: true,
      data: { signedOutSessions: result.count },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(request, response, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const passwordIsValid =
      user && (await argon2.verify(user.passwordHash, request.body.password));
    if (!passwordIsValid) {
      return response.status(401).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "Password is incorrect." },
      });
    }
    await prisma.user.delete({ where: { id: request.user.id } });
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
