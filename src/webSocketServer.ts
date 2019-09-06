import * as ws from 'ws';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import { Observable, Subscriber } from '../node_modules/rxjs/index.d';
import { map, tap } from '../node_modules/rxjs/operators/index.d';


export class WebSocketServer {
    private clientsConnected: MapArraySocket = {};

    public createWebSocketServer(port: number): void {
        const wsServer = new ws.Server({ port: port });
        wsServer.on('connection', this.onConnection.bind(this));
    }

    private onConnection(socket: ws, incomingMessage: IncomingMessage) {
        const token = this.getTokenFromUrl(socket.url);
        

        this.decodedToken(token)
            .pipe(
                tap((dataDecoded) => this.addTokenInClientArray(socket, dataDecoded.id, this.clientsConnected)),
            )
            .subscribe(
                (dataDecoded) => {
                    // TODO afficher le nom, le prenom et le id
                    console.log('new user connected');
                },
                (error) => {
                    console.log(`cannot register the user ${error.message}`);
                }
            )
    }

    /**
     * get token from url
     * @param url the url with params query
     */
    private getTokenFromUrl(url: string): string | null {
        const urlParsed = new URL(url);
        return urlParsed.searchParams.get('token');
    }

    /**
     * decoded token
     * @param token The token
     */
    private decodedToken(token: string): Observable<any> {
        return new Observable((subscriber: Subscriber<any>) => {
            jwt.verify(token, 'mySecret', (err, decoded) => {
                if (err) return subscriber.error(err);
                subscriber.next(token);
                subscriber.complete();
            });
        });
    }

    /**
     * Add token to array
     * @param socket The socket
     * @param id The user id
     * @param clientMapArray The socket client map array
     */
    private addTokenInClientArray(socket: ws, id: string, clientMapArray: MapArraySocket): void {
        clientMapArray[id] = socket;
    }

    // parse url et recuperer le token
    // decrypter le token
    // si decrypter ajouter dans le tableau du client sinon fermer la connection
}

export type MapArraySocket = { [id: string]: ws };