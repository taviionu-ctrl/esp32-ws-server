import fs from "fs";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import url from "url";

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {

  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("OK. WebSocket endpoint: /ws\n");
  }

  if (req.url === "/control") {
    const filePath = path.join(process.cwd(), "control.html");
    const html = fs.readFileSync(filePath, "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ noServer: true });
const devices = new Map(); // id -> ws

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

wss.on("connection", (ws) => {
  // Fără verificare token sau role
  ws.on("message", (msg) => {
    let data;
    try { data = JSON.parse(msg.toString()); } catch { return; }

    const to = String(data.to || "");
    const cmd = String(data.cmd || "");
    const value = Number(data.value);

    // Se trimite comanda LED doar dacă sunt valori valide
    if (!to || cmd !== "led" || !(value === 0 || value === 1)) return;

    const dev = devices.get(to);
    if (!dev || dev.readyState !== 1) {
      ws.send(JSON.stringify({ type: "err", msg: "device offline" }));
      return;
    }

    dev.send(JSON.stringify({ cmd: "led", value }));
    ws.send(JSON.stringify({ type: "ok", to, cmd, value }));
  });
});

server.listen(PORT, () => {
  console.log("Listening on", PORT);
});
