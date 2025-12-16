import http from "http";
import { WebSocketServer } from "ws";
import url from "url";

// Setează portul și token-ul (poți adăuga un token pentru securitate dacă vrei)
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || "schimba-ma"; // Poți schimba token-ul aici

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("WebSocket endpoint: /ws\n");
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ noServer: true });
const devices = new Map(); // Mapă pentru a ține track de dispozitivele conectate

server.on("upgrade", (req, socket, head) => {
  const { pathname } = url.parse(req.url);
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  const parsed = url.parse(req.url, true);
  const token = String(parsed.query.token || "");

  // Verifică token-ul pentru autentificare (opțional)
  if (token !== API_TOKEN) {
    ws.close(1008, "bad token");
    return;
  }

  // Ascultă mesajele trimise de la client
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    const cmd = String(data.cmd || "");
    const value = Number(data.value);

    // Dacă comanda este de tip "led" și valoarea este 0 sau 1, trimite comanda către dispozitiv
    if (cmd === "led" && (value === 0 || value === 1)) {
      // Aici poți să pui logica pentru a aprinde/opri LED-ul
      console.log(`LED ${value === 1 ? "ON" : "OFF"}`);

      // Dacă vrei, trimite feedback clientului
      ws.send(JSON.stringify({ type: "ok", cmd, value }));
    }
  });

  // La închidere conexiune
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});
