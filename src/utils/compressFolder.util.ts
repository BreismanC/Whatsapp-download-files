import fs from "node:fs";
import archiver from "archiver";

export function compressFolder(
  folderPath: string,
  compressFolderPath: string,
  outPutPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Crear un flujo de escritura para el archivo ZIP

    if (!fs.existsSync(compressFolderPath)) {
      fs.mkdirSync(compressFolderPath, { recursive: true });
    }

    const output = fs.createWriteStream(outPutPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Nivel de compresión más alto
    });

    // Manejar errores del archivo ZIP
    output.on("close", () => {
      console.log(`Archivo ZIP creado exitosamente: ${outPutPath}`);
      console.log(`Tamaño total: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on("error", (err: Error) => {
      console.log("Ha ocurrido un error al comprimir el archivo");
      reject(err);
    });

    // Conectar el flujo de escritura al archivo ZIP
    archive.pipe(output);

    // Agregar la carpeta al archivo ZIP
    archive.directory(folderPath, false);

    // Finalizar el archivo ZIP
    archive.finalize();
  });
}
