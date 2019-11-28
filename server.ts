import { WebSocketServer } from "./src/webSocketServer";

const webSocketServer = new WebSocketServer();
webSocketServer.startWebSocketServer(process.env.PORT || 8181);
