import { createServer } from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`Nagrik Setu API listening on port ${env.PORT}`);
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received. Shutting down API server.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});
