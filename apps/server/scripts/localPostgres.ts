/* Local Postgres without Docker (development only). Starts Postgres 17 on
   port 5432 with data kept in .localdb/, so the server and migrations work
   the same as with docker compose. Stop it with Ctrl+C. */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import EmbeddedPostgres from "embedded-postgres"

const dataDir = join(process.cwd(), ".localdb")
const port = 5432

async function main() {
  const fresh = !existsSync(join(dataDir, "PG_VERSION"))
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const postgres = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port, persistent: true })
  if (fresh) await postgres.initialise()
  try {
    await postgres.start()
  } catch {
    console.log("Port " + port + " is already in use. If PostgreSQL is already running with user postgres and password postgres, you do not need db:local - just run the migration and dev:server.")
    process.exit(1)
  }
  try {
    await postgres.createDatabase("secret_hitler")
  } catch {
    // database already exists
  }
  console.log("Postgres is running on localhost:" + port + " (database secret_hitler). Press Ctrl+C to stop.")
  const stop = async () => {
    await postgres.stop()
    process.exit(0)
  }
  process.on("SIGINT", () => void stop())
  process.on("SIGTERM", () => void stop())
}

void main()
