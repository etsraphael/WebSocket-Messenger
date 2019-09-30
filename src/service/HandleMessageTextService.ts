import { IHandleMessageService } from "./IHandleMessageService";
import { Message } from "../model/Message";
import { DataUserConnectedMapArray } from "../webSocketServer";
import { Observable, from, iif, of } from "rxjs";
import { IDataUserConnected } from "../model/IDataUserConnected";
import WebSocket = require("ws");
import { mergeMap } from "rxjs/operators";
import { Optional } from "typescript-optional";

export class HandleMessageTextService implements IHandleMessageService {
  handle(
    message: Message,
    clientConnected: DataUserConnectedMapArray
  ): Observable<void> {
    return this.getParticipants(message)
      .map(idParticipants =>
        from(idParticipants).pipe(
          mergeMap(participantId =>
            iif(
              () => Array.isArray(clientConnected[participantId]),
              this.sendMessageToUser(message, clientConnected[participantId]),
              this.printMessageUserNotConnected(participantId)
            )
          )
        )
      )
      .orElseGet(() => of(null) as Observable<void>);
  }

  private printMessageUserNotConnected(
    participantId: string
  ): Observable<void> {
    return new Observable((subscriber): void => {
      console.log(`The user with the id ${participantId} is not connected`);
      return subscriber.next();
    });
  }

  private sendMessageToUser(
    message: Message,
    dataUserConnectedArray: IDataUserConnected[]
  ): Observable<void> {
    return new Observable((subscriber): void => {
      dataUserConnectedArray.map<void>(dataUserConnected => {
        if (dataUserConnected.websocket.readyState === WebSocket.OPEN) {
          dataUserConnected.websocket.send(JSON.stringify(message));
          console.log(
            "Message send to user id : " + dataUserConnected.payloadToken.id
          );
          return;
        }

        console.log(
          `Message cannot be send to user with id ${dataUserConnected.payloadToken.id}, the socket is close`
        );

        return;
      });

      return subscriber.next();
    });
  }

  private getParticipants(message: Message): Optional<string[]> {
    const participantOptional = message.participants
      ? Optional.of(message.participants)
      : Optional.empty<string[]>();

    if (participantOptional.isEmpty())
      console.log("Not have participants array in message");

    return participantOptional;
  }
}
