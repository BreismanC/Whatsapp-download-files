import fs from "node:fs";

export function saveMediaInMessage(
  msgId: any,
  image: any,
  media: any,
  outputPath: string
) {
  try {
    const filePath = `${outputPath}/${msgId}.${image.mimetype.split("/")[1]}`;

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    fs.writeFile(filePath, media, { encoding: "base64" }, (err) => {
      if (err) {
        throw new Error("Error al guardar la imagen");
      } else {
        console.log(`Imagen guardada en: ${filePath}`);
      }
    });
  } catch (error) {
    console.log("Error al obtener los archivos multimedia");
  }
}
