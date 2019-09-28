import { WebSocketServer } from "./src/webSocketServer";
/*
const wsServer = new ws.Server({ port: 8181 });

wsServer.on("connection", ws => {
  console.log("client connected");
  ws.on("message", () => {
    console.log("new message");
  });
});
*/

const webSocketServer = new WebSocketServer();
webSocketServer.createWebSocketServer(8181);
