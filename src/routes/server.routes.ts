import { Request, Response, Router } from "express";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { saveMediaInMessage } from "../utils";
import { compressFolder } from "../utils/compressFolder.util";

import fs from "node:fs";
import path from "node:path";

export class AppRoutes {
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  get routes(): Router {
    const router = Router();

    router.get("/groups", async (_, response: Response) => {
      try {
        console.log("Obteniendo grupos");
        const contacts = await this.store.contacts;
        console.log(contacts);
        response.status(200).json({
          data: contacts,
          status: "success",
          code: 200,
        });
      } catch (error) {
        response.status(500).json({
          message: "Error al obtener los chats",
          status: "error",
          data: error,
          code: 500,
        });
      }
    });

    router.get("/groups/:id/chat", async (req: Request, res: Response) => {
      //Definición de variables para gestión de mensajes
      let lastMessageId = null;
      let allMessages: any[] = [];
      let hasMoreMessages = true;
      let initialDate: null | Date = null;
      let finalDate: null | Date = null;
      const imagesDir = path.join(__dirname, "../..", "tmp", "images");
      const zipFileName = `${Date.now()}.zip`;
      const compressfolderPath = path.join(__dirname, "../..", "tmp", "zips");
      const outPutPath = path.join(compressfolderPath, zipFileName);

      try {
        const { id } = req.params;
        const { count = 100, startDate, endDate } = req.query;

        console.log(`Obteniendo mensajes del grupo ${id}`);

        if (startDate) {
          initialDate = new Date(startDate as string);
        }

        if (endDate) {
          finalDate = new Date(endDate as string);
        }

        //Recorrer los mensajes del grupo y guardarlos en un array
        do {
          const messages: any = await this.store.loadMessages(
            id,
            count,
            lastMessageId ? { before: lastMessageId } : undefined
          );

          if (!messages.length) {
            console.log("No hay mensajes");
            break;
          }

          //Si no se pasa fecha de inicio ni fecha final, se devuelven la cantidad de mensajes más reciente idicada en count
          if (!initialDate && !finalDate) {
            allMessages = allMessages.concat(messages);
            break;
          } else {
            // Filtrar los mensajes dentro del rango de fechas especificado
            const filteredMessages = messages.filter((msg: any) => {
              const messageDate = new Date(msg.messageTimestamp * 1000); // Convierte el timestamp
              return messageDate >= initialDate! && messageDate <= finalDate!;
            });

            allMessages = allMessages.concat(filteredMessages);
          }

          // Verifica si hay mensajes anteriores a la fecha de inicio
          const isBeforeStartDate = messages.some((msg: any) => {
            const messageDate = new Date(msg.messageTimestamp * 1000);
            return messageDate < initialDate!;
          });

          if (isBeforeStartDate || messages.length < count) {
            hasMoreMessages = false;
          }

          // Actualiza el cursor para paginación
          lastMessageId = messages[0].key;
        } while (hasMoreMessages);

        // Descargar las imágenes de los mensajes
        await Promise.all(
          allMessages.map(async (msg) => {
            if (!msg.message.imageMessage) {
              return;
            }

            try {
              const media = await downloadMediaMessage(msg, "buffer", {});
              if (!media) {
                console.log("No hay datos de la imagen");
                return;
              }
              saveMediaInMessage(
                msg.key.id,
                msg.message.imageMessage,
                media,
                imagesDir
              );
            } catch (error) {
              console.log(
                "Sucedió un error al intentar recuperar la imagen: ",
                error
              );
              return;
            }
          })
        );

        // Comprimir la carpeta con las imagenes
        try {
          await compressFolder(imagesDir, compressfolderPath, outPutPath);
        } catch (error) {
          console.log("Error al comprimir la carpeta", error);
          throw new Error("Error al comprimir la carpeta");
        }

        // Si no se se pudo comprimir el archivo se finaliza la petición
        if (!fs.existsSync(outPutPath)) {
          console.log("Archivo ZIP no encontrado");
          throw new Error("Archivo ZIP no encontrado");
        }

        // Configurar la cabecera de respuesta
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${zipFileName}`
        );

        // Enviar el archivo como un stream
        const fileStream = fs.createReadStream(outPutPath);

        fileStream.pipe(res);

        fileStream.on("close", () => {
          console.log("Archivo enviado exitosamente");

          // Eliminar los archivos temporales
          try {
            fs.rmSync(imagesDir, { recursive: true, force: true });
            fs.rmSync(compressfolderPath, { recursive: true, force: true });
            console.log("Archivos temporales eliminados correctamente.");
          } catch (error) {
            console.error("Error al eliminar los archivos temporales:", error);
          }

          // res.status(200).send("Arhivo enviado exitosamente");
        });

        fileStream.on("error", (error) => {
          console.error("Error al enviar el archivo:", error);

          if (!res.headersSent) {
            res.status(500).send("Error al enviar el archivo");
          }

          // Eliminar archivos incluso en caso de error
          try {
            fs.rmSync(imagesDir, { recursive: true, force: true });
            fs.rmSync(compressfolderPath, { recursive: true, force: true });
            console.log("Archivos temporales eliminados después del error.");
          } catch (cleanupError) {
            console.error(
              "Error al eliminar los archivos temporales:",
              cleanupError
            );
          }
        });
      } catch (error) {
        // Eliminar los archivos temporales en caso de alguna falla
        try {
          fs.rmSync(imagesDir, { recursive: true, force: true });
          fs.rmSync(compressfolderPath, { recursive: true, force: true });
          console.log("Arhivos temporales eliminados correctamente");
        } catch (error) {
          console.log("Error al eliminar los archivos temporales", error);
        }

        res.status(500).json({
          message: "Error en el servidor",
          status: "error",
          data: error,
          code: 500,
        });
      }
    });

    return router;
  }
}
