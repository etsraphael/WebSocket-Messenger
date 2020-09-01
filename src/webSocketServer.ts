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
import * as http from "http";

export class WebSocketServer {
  private clientsConnected: DataUserConnectedMapArray = {};

  constructor(
    private handleMessageTextService: IHandleMessageService = new HandleMessageTextService()
  ) {}

  public startWebSocketServer(port: number | string): void {
    const portConverted = typeof port === "string" ? parseInt(port) : port;
    const server = http.createServer();
    server.listen(portConverted);
    const wsServer = new ws.Server({ server });
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
              dataUserConnectedArray[0].payloadToken.profile,
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
              `new connection with profile id ${dataUserConnectedArray[0].payloadToken.profile}`
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
    (websocket as any).idProfile = payloadToken.profile;

    const dataUserConnected: IDataUserConnected = {
      websocket,
      connectedAt: dateNow,
      payloadToken
    };

    const getDataUserConnected = R.ifElse(
      (dataUserConnectedArray: DataUserConnectedMapArray) =>
        typeof dataUserConnectedArray[payloadToken.profile] === "object",
      (dataUserConnectedArray: DataUserConnectedMapArray) =>
        dataUserConnectedArray[payloadToken.profile].concat([
          dataUserConnected
        ]),
      (dataUserConnectedArray: DataUserConnectedMapArray) => [dataUserConnected]
    );

    return getDataUserConnected(dataUserConnectedArray) as IDataUserConnected[];
  }

  private getExecSetDataUserConnected(
    idProfile: string,
    clientConnected: DataUserConnectedMapArray,
    dataUserConnectedArray: IDataUserConnected[]
  ): Executor {
    return new Executor(() => {
      clientConnected[idProfile] = dataUserConnectedArray;
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
      const idProfile = (socket as any).idProfile;
      const connectedAt = (socket as any).connectedAt;
      const dataUserConnectedArray = this.clientsConnected[idProfile];

      if (Array.isArray(dataUserConnectedArray)) {
        this.findIndexByIdUserAndConnectedAt(
          dataUserConnectedArray,
          idProfile,
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
              idProfile
            ).execute()
          );
      }
    });
  }

  private findIndexByIdUserAndConnectedAt(
    dataUserConnectedArray: IDataUserConnected[],
    idProfile: string,
    connectedAt: number
  ): Optional<number> {
    const indexForRemove = dataUserConnectedArray.findIndex(
      dataUserConnected =>
        (dataUserConnected.websocket as any).idProfile === idProfile &&
        (dataUserConnected.websocket as any).connectedAt === connectedAt
    );

    return indexForRemove > -1 ? Optional.of(indexForRemove) : Optional.empty();
  }

  private deletedDataUserConnectedArrayEmpty(
    clientConnected: DataUserConnectedMapArray,
    idProfile: string
  ): Executor {
    return new Executor(() => {
      const dataArrayUserDisconnected = clientConnected[idProfile];
      if (
        Array.isArray(dataArrayUserDisconnected) &&
        dataArrayUserDisconnected.length === 0
      ) {
        delete this.clientsConnected[idProfile];
        console.log(`deleted data array for user id ${idProfile}`);
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
        `deleted data for user profile id ${dataUserDeleted[0].payloadToken.profile}`
      );
    });
  }
  
}

export type DataUserConnectedMapArray = {
  [idProfile: string]: IDataUserConnected[];
}
