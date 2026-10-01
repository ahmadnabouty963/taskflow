import "dotenv/config";
import app from "./app.js";
import prisma from "./lib/prisma.js";

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connection successful.");

    app.listen(port, () => {
      console.log(`TaskFlow API is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database connection failed.");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
