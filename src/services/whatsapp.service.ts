import {
  useMultiFileAuthState,
  default as makeWASocket,
  ConnectionState,
  DisconnectReason,
  WAMessage,
  MessageUpsertType,
  makeInMemoryStore,
  Contact,
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";

export class WhatsappService {
  public socket: any;
  public store: any;

  async connect() {
    this.handleStore();
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    // Inicia el socket
    this.socket = makeWASocket({
      auth: state, // Tu configuración de autenticación
      printQRInTerminal: true, // Si deseas mostrar el QR en consola para escanear
    });

    this.store.bind(this.socket.ev);

    this.socket.ev.on("creds.update", saveCreds);
    this.socket.ev.on(
      "connection.update",
      this.handleConnectionUpdate.bind(this)
    );
    this.socket.ev.on("messages.upsert", this.handleMessagesUpsert.bind(this));

    this.socket.ev.on("contacts.upsert", this.handleContactsUpsert);
  }

  private handleStore() {
    this.store = makeInMemoryStore({});
    this.store.readFromFile("./auth/baileys_store.json");
    setInterval(() => {
      this.store.writeToFile("./auth/baileys_store.json");
    }, 10000);
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>) {
    const {
      connection,
      lastDisconnect,
      // qr
    } = update;

    // if (qr) {
    //   try {
    //     //Generate the QR as Data URL and send it to the frontend
    //     this.qrCodeDataURL = await QRCode.toDataURL(qr);
    //     this.io.emit("qr", {
    //       qr: this.qrCodeDataURL,
    //       message: "Escanea el código QR con tu teléfono",
    //     });
    //     console.log("QR emitido al frontend");
    //   } catch (error) {
    //     throw new Error("Error al enviar el código QR al front");
    //   }
    // }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect?.error,
        ", reconnecting ",
        shouldReconnect
      );

      // reconnect if not logged out
      if (shouldReconnect) {
        this.connect();
      }
    } else if (connection === "open") {
      console.log("Conexión a WhatsApp abierta");
    } else if (connection === "connecting") {
      console.log("Conectando con whatsapp");
    }
  }

  handleMessagesUpsert({
    messages,
    type,
  }: {
    messages: WAMessage[];
    type: MessageUpsertType;
  }) {
    console.log("Tipo de mensaje", type);
    messages.forEach((message) => {
      console.log("Mensaje", message);
    });
  }

  handleContactsUpsert() {
    console.log(
      "Contactos iniciales recibidos, ya puedes acceder a sock.store.contacts"
    );
    const contacts = this.socket?.store?.contacts;

    if (!contacts) {
      return;
    }

    const contactList: Contact[] = Object.values(contacts);
    const userContacts = contactList.filter(
      (contact) =>
        contact.id &&
        !contact.id.includes("@g.us") &&
        !contact.id.includes("@s.whatsapp.net")
    );

    userContacts.forEach((contact) => {
      console.log(
        "Nombre:",
        contact.name || contact.verifiedName || "Sin nombre"
      );
      console.log("Número:", contact.id.split("@")[0]);
      console.log("--------------------");
    });
  }
}
