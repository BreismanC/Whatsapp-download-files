import { Router } from "express";

export interface ServerOptions {
  port?: number;
  router: Router;
}
