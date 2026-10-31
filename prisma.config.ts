import { defineConfig } from 'prisma/config';
import { databaseUrl } from './lib/db-url';

// Not env() from prisma/config: it throws when DATABASE_URL is unset, and we need no .env.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() },
});
