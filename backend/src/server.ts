import "dotenv/config";
import app from "./app";
import { ensureEmailIndex } from "./services/email-search.service";


const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function startServer() {
  try {
    await ensureEmailIndex();

    const server = app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start API server:", error);
    process.exit(1);
  }
}

startServer();