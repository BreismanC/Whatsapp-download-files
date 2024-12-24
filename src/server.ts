import express, { Router, urlencoded } from "express";
import { Server as HTTPServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { ServerOptions } from "./interfaces";
import { envVariables } from "./config";

export class Server {
  public readonly app = express();
  private readonly port: number;
  private readonly router: Router;
  private httpServer: HTTPServer;
  public io: IOServer;

  constructor(options: ServerOptions) {
    const { port = 3100, router } = options;
    this.port = port;
    this.router = router;
    this.httpServer = new HTTPServer(this.app);
    this.io = new IOServer(this.httpServer, {
      cors: {
        origin: envVariables.HOST,
        methods: ["GET", "POST"],
      },
    });
  }

  async start() {
    //middlewares
    this.app.use(express.json());
    this.app.use(urlencoded({ extended: true }));

    //Routes
    this.app.use("/api/v1", this.router);

    // Serve static files
    this.app.use(express.static("public"));

    this.httpServer.listen(this.port, "0.0.0.0", () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}
