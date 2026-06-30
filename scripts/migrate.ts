import { loadEnvConfig } from "@next/env";

import { migrateDatabase } from "@/db/migrations";

loadEnvConfig(process.cwd());

migrateDatabase()
  .then(() => {
    console.log("Migrations applied.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
