/**
 * @description
 * This is the configuration file for Drizzle Kit, the command-line tool for Drizzle ORM.
 * It specifies where to find the database schema, where to output migration files,
 * and how to connect to the database.
 *
 * Key features:
 * - Loads environment variables from the centralized `config/env/.env.local` file using `dotenv`.
 * - Specifies the schema file location at `./src/db/schema`.
 * - Defines the output directory for migrations as `./src/db/migrations`.
 * - Uses the PostgreSQL dialect.
 * - Retrieves the database connection URL from the `DATABASE_URL` environment variable.
 *
 * @dependencies
 * - dotenv: Used to load environment variables from a file.
 * - drizzle-kit: The core Drizzle Kit library.
 *
 * @notes
 * - This configuration is essential for running Drizzle Kit commands like `db:push` and `db:migrate`.
 * - The `dotenv.config()` call is crucial for ensuring that the CLI can find the `DATABASE_URL`
 *   when run from the project root.
 */
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

// Load environment variables from the new centralized location
config({ path: path.resolve(process.cwd(), "config/env/.env.local") });

// Ensure the DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in the environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema/*", // Points to the schema files inside the src directory
  out: "./src/db/migrations", // Outputs migrations to a folder inside the src directory
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
