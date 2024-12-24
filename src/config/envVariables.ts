process.loadEnvFile();
import { EnvVariables } from "../interfaces";

export const envVariables: EnvVariables = {
  NODE_ENV: process.env.NODE_ENV as string,
  HOST:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : (process.env.HOST as string),
  PORT: process.env.PORT as unknown as number,
};
