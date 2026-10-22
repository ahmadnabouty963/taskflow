// Grants or revokes platform administrator rights. There is deliberately no
// way to do this from inside the app.
//   npm run admin:grant -- person@example.com
//   npm run admin:revoke -- person@example.com
import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const [mode, rawEmail] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

if (!["grant", "revoke"].includes(mode) || !email) {
  console.error("Usage: node scripts/set-platform-admin.js <grant|revoke> <email>");
  process.exit(1);
}

try {
  const user = await prisma.user.update({
    where: { email },
    data: { isPlatformAdmin: mode === "grant" },
    select: { email: true, isPlatformAdmin: true },
  });
  console.log(`${user.email}: platform admin = ${user.isPlatformAdmin}`);
} catch (error) {
  console.error(error.code === "P2025" ? `No account found for ${email}.` : error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
