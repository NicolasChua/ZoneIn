import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import express from "express";
import cors from "cors";
import { openaiRouter } from "./routes/openai_route.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:8080" })); // Vite dev

app.use("/api", openaiRouter);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Backend running at http://localhost:${port}`)
);