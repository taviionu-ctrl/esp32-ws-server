import http from "http";
import { WebSocketServer } from "ws";
import url from "url";

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || "schimba-ma";

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("OK. WebSocket endpoint: /ws");
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });
const devices = new Map();

server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = url.parse(req.url, true);

  if (pathname !== "/ws" || query.token !== API_TOKEN) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, query);
  });
});

wss.on("connection", (ws, query) => {
  const role = query.role || "web";
  const deviceId = query.id || "esp32";

  if (role === "device") {
    devices.set(deviceId, ws);
    ws.send("HELLO_DEVICE");
  } else {
    ws.send("HELLO_WEB");
  }

  ws.on("message", (msg) => {
    if (role === "web") {
      const dev = devices.get(deviceId);
      if (dev && dev.readyState === dev.OPEN) {
        dev.send(msg.toString());
      }
    }
  });

  ws.on("close", () => {
    if (role === "device" && devices.get(deviceId) === ws) {
      devices.delete(deviceId);
    }
  });
});

server.listen(PORT, () => {
  console.log("Listening on", PORT);
});
