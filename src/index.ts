import { envVariables } from "./config";
import { Server } from "./server";
import { WhatsappService } from "./services";
import { AppRoutes } from "./routes/server.routes";

async function main() {
  const whatsappService = new WhatsappService();

  await whatsappService.connect().catch((error) => {
    console.log("Error en la conexión con whatsapp", error);
  });

  const appRoutes = new AppRoutes(whatsappService.store);

  const server = new Server({
    port: envVariables.PORT,
    router: appRoutes.routes,
  });

  await server.start().catch((error) => {
    console.log("Error al iniciar el servidor", error);
  });
}

main();
