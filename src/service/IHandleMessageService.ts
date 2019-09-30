import { Message } from "../model/Message";
import { DataUserConnectedMapArray } from "../webSocketServer";
import { Observable } from "rxjs";

export interface IHandleMessageService {
  handle(
    message: Message,
    clientConnected: DataUserConnectedMapArray
  ): Observable<void>;
}
