import * as ws from "ws";
import { IPayloadToken } from "./IPayloadToken";

export interface IDataUserConnected {
  websocket: ws;
  connectedAt: number;
  payloadToken: IPayloadToken;
}
