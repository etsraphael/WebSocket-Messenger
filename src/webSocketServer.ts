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

export class WebSocketServer {
  private clientsConnected: DataUserConnectedMapArray = {};

  public createWebSocketServer(port: number): void {
    const wsServer = new ws.Server({ port: port });
    wsServer.on("connection", this.onConnection.bind(this));
  }

  private onConnection(socket: ws, incomingMessage: IncomingMessage) {
    const token = this.getTokenFromUrl(incomingMessage.url);

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
      );
  }

  /**
   * get token from url
   * @param url the url with params query
   */
  private getTokenFromUrl(url: string): string | null {
    if (url[0] === "/") {
      const urlFormated = `ws://${os.hostname()}${url}`;
      const urlParsed = new URL(urlFormated);
      return urlParsed.searchParams.get("token");
    }

    const urlParsed = new URL(url);
    return urlParsed.searchParams.get("token");
  }

  /**
   * decoded token
   * @param token The token
   */
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
    const dataUserConnected: IDataUserConnected = {
      websocket,
      connectedAt: Date.now(),
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
}

export type DataUserConnectedMapArray = { [id: string]: IDataUserConnected[] };
