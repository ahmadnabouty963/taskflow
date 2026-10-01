import express from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (request, response) => {
  return response.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "taskflow-api",
    },
  });
});

export default app;
