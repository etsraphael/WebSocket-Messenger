import * as ws from "ws";

const wsServer = new ws.Server({ port: 8181 });

wsServer.on("connection", ws => {
  console.log("client connected");
  ws.on("message", () => {
    console.log("new message");
  });
});
