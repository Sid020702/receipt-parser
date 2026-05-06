import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { initDb } from "./lib/db";
import { parseRouter } from "./routes/parse";
import { receiptsRouter } from "./routes/receipts";
import { mkdir } from "fs/promises";

await mkdir("./data", { recursive: true });
await mkdir("./uploads", { recursive: true });

const db = initDb("./data/receipts.db");

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:5173" }));

app.use("/uploads/*", serveStatic({ root: "./" }));

app.route("/api/parse", parseRouter(db));
app.route("/api/receipts", receiptsRouter(db));

const port = parseInt(process.env.PORT ?? "3001");
console.log(`Server running on http://localhost:${port}`);

export default { port, fetch: app.fetch };
