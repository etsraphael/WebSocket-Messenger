import * as ws from "ws";
import * as os from "os";
import { IncomingMessage } from "http";
import * as jwt from "jsonwebtoken";
import { Observable, Subscriber } from "../node_modules/rxjs/index.d";
import { map, tap, take } from "rxjs/operators";
import { IPayloadToken } from "./model/IPayloadToken";
import * as R from "ramda";
import { IDataUserConnected } from "./model/IDataUserConnected";
import { Executor } from "./util/Executor";
import { Message } from "./model/Message";
import { HandleMessageTextService } from "./service/HandleMessageTextService";
import { IHandleMessageService } from "./service/IHandleMessageService";
import { Optional } from "typescript-optional";

export class WebSocketServer {
  private clientsConnected: DataUserConnectedMapArray = {};

  constructor(
    private handleMessageTextService: IHandleMessageService = new HandleMessageTextService()
  ) {}

  public startWebSocketServer(port: number): void {
    const wsServer = new ws.Server({ port: port });
    wsServer.on("connection", this.onConnection.bind(this));
  }

  private onConnection(socket: ws, incomingMessage: IncomingMessage) {
    this.getTokenFromUrl(incomingMessage.url).map(token =>
      this.decodedToken$(token)
        .pipe(
          map(dataDecoded =>
            this.concatSocketInClientArray(
              socket,
              dataDecoded,
              this.clientsConnected
            )
          ),
          tap(dataUserConnectedArray =>
            this.getExecSetDataUserConnected(
              dataUserConnectedArray[0].payloadToken.id,
              this.clientsConnected,
              dataUserConnectedArray
            ).execute()
          ),
          tap(_ => this.handleOnMessage(socket)),
          tap(_ => this.handleOnDisconnected(socket)),
          take(1)
        )
        .subscribe(
          dataUserConnectedArray => {
            console.log(
              `new connection with id ${dataUserConnectedArray[0].payloadToken.id}`
            );
          },
          error => {
            console.log(`cannot register the user : ${error.message}`);
          }
        )
    );
  }

  private getTokenFromUrl(url: string): Optional<string> {
    try {
      if (url[0] === "/") {
        const urlFormated = `ws://${os.hostname()}${url}`;
        const urlParsed = new URL(urlFormated);
        return Optional.ofNullable(urlParsed.searchParams.get("token"));
      }

      const urlParsed = new URL(url);
      return Optional.ofNullable(urlParsed.searchParams.get("token"));
    } catch (error) {
      console.log(`Error get token from url`);
      return Optional.empty();
    }
  }

  private decodedToken$(token: string): Observable<IPayloadToken> {
    return new Observable((subscriber: Subscriber<IPayloadToken>) => {
      jwt.verify(token, "averysecretkey", (err, decoded) => {
        if (err) return subscriber.error(err);
        subscriber.next(decoded as IPayloadToken);
        subscriber.complete();
      });
    });
  }

  private concatSocketInClientArray(
    websocket: ws,
    payloadToken: IPayloadToken,
    dataUserConnectedArray: DataUserConnectedMapArray
  ): IDataUserConnected[] {
    const dateNow = Date.now();
    (websocket as any).connectedAt = dateNow;
    (websocket as any).idUser = payloadToken.id;

    const dataUserConnected: IDataUserConnected = {
      websocket,
      connectedAt: dateNow,
      payloadToken
    };

    const getDataUserConnected = R.ifElse(
      (dataUserConnectedArray: DataUserConnectedMapArray) =>
        typeof dataUserConnectedArray[payloadToken.id] === "object",
      (dataUserConnectedArray: DataUserConnectedMapArray) =>
        dataUserConnectedArray[payloadToken.id].concat([dataUserConnected]),
      (dataUserConnectedArray: DataUserConnectedMapArray) => [dataUserConnected]
    );

    return getDataUserConnected(dataUserConnectedArray) as IDataUserConnected[];
  }

  private getExecSetDataUserConnected(
    idUser: string,
    clientConnected: DataUserConnectedMapArray,
    dataUserConnectedArray: IDataUserConnected[]
  ): Executor {
    return new Executor(() => {
      clientConnected[idUser] = dataUserConnectedArray;
    });
  }

  private handleOnMessage(socket: ws): void {
    console.log("handle on message for new user");

    socket.on("message", (data: string) => {
      this.parseMessage(data).map(message => {
        switch (message.type) {
          case "text":
            this.handleMessageTextService
              .handle(message, this.clientsConnected)
              .subscribe();
            break;
        }
      });
    });
  }

  private parseMessage(data: string): Optional<Message> {
    try {
      return Optional.ofNullable(JSON.parse(data));
    } catch (error) {
      console.log(`Error parse message : ${error.message}`);
      return Optional.empty();
    }
  }

  private handleOnDisconnected(socket: ws) {
    socket.on("close", (code, reason) => {
      const idUser = (socket as any).idUser;
      const connectedAt = (socket as any).connectedAt;
      const dataUserConnectedArray = this.clientsConnected[idUser];

      if (Array.isArray(dataUserConnectedArray)) {
        this.findIndexByIdUserAndConnectedAt(
          dataUserConnectedArray,
          idUser,
          connectedAt
        )
          .map(indexForRemove => {
            this.deletedDataUserConnectedByIndex(
              dataUserConnectedArray,
              indexForRemove
            ).execute();

            return indexForRemove;
          })
          .map(_ =>
            this.deletedDataUserConnectedArrayEmpty(
              this.clientsConnected,
              idUser
            ).execute()
          );
      }
    });
  }

  private findIndexByIdUserAndConnectedAt(
    dataUserConnectedArray: IDataUserConnected[],
    idUser: string,
    connectedAt: number
  ): Optional<number> {
    const indexForRemove = dataUserConnectedArray.findIndex(
      dataUserConnected =>
        (dataUserConnected.websocket as any).idUser === idUser &&
        (dataUserConnected.websocket as any).connectedAt === connectedAt
    );

    return indexForRemove > -1 ? Optional.of(indexForRemove) : Optional.empty();
  }

  private deletedDataUserConnectedArrayEmpty(
    clientConnected: DataUserConnectedMapArray,
    idUser: string
  ): Executor {
    return new Executor(() => {
      const dataArrayUserDisconnected = clientConnected[idUser];
      if (
        Array.isArray(dataArrayUserDisconnected) &&
        dataArrayUserDisconnected.length === 0
      ) {
        delete this.clientsConnected[idUser];
        console.log(`deleted data array for user id ${idUser}`);
      }
    });
  }

  private deletedDataUserConnectedByIndex(
    dataUserConnectedArray: IDataUserConnected[],
    index: number
  ): Executor {
    return new Executor(() => {
      const dataUserDeleted = dataUserConnectedArray.splice(index, 1);
      console.log(
        `deleted data for user id ${dataUserDeleted[0].payloadToken.id}`
      );
    });
  }
}
export type DataUserConnectedMapArray = { [id: string]: IDataUserConnected[] };
