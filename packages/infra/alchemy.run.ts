import * as Alchemy from "alchemy";
import * as Prisma from "alchemy/Prisma";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/server/.env" });

export const prismaProject = Prisma.Project("project", {
  createDatabase: false,
  region: "us-east-1",
});

export const databaseEnv = Effect.succeed({
  DATABASE_URL: Config.redacted("DATABASE_URL"),
});

export const databaseProviders = Prisma.providers();

export const server = Prisma.Compute(
  "server",
  Effect.gen(function* () {
    const project = yield* prismaProject;
    const resolvedDatabaseEnv = yield* databaseEnv;

    return {
      project,
      path: "../../apps/server",
      build: {
        type: "auto" as const,
        framework: "bun" as const,
      },
      entrypoint: "src/index.ts",
      port: 3000,
      env: {
        ...resolvedDatabaseEnv,
        CORS_ORIGIN: Config.string("CORS_ORIGIN"),
        BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
        BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL"),
      },
      healthCheck: { path: "/" },
      destroyOldDeployment: true,
      dev: {
        command: "npm run dev:bare",
        port: 3000,
      },
    };
  }),
);

export default Alchemy.Stack(
  "my-better-t-app",
  {
    providers: databaseProviders,
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const serverWorker = yield* server;

    return {
      server: serverWorker.url,
    };
  }),
);
