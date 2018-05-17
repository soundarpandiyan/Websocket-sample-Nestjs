import * as WebSocket from 'ws';
import { WebSocketAdapter, Injectable } from '@nestjs/common';
import { MessageMappingProperties, WebSocketServer } from '@nestjs/websockets';
import { Observable, fromEvent, empty } from 'rxjs';
import { mergeMap, filter, tap } from 'rxjs/operators';

@Injectable()
export class WsAdapter implements WebSocketAdapter {
    static socket: any;
    static socketClients = [];
    static messages = [];
    static featureSubscribtions: any;
    static socketCount = 100;
    public create(port: number) {
        WsAdapter.socket = new WebSocket.Server({ port });
        this.bindClientConnect(WsAdapter.socket, this.connectionRequest.bind(this))
    }

    public close() {
        if (WsAdapter.socket)
            WsAdapter.socket.close();
    }

    constructor() {
        this.sampleMesssage();
    }

    sampleMesssage = () => {
        setInterval(() => {
            this.sendNotification("Message sent from server");
        }, 1000);
    }

    public connectionRequest(ws, req) {
        let self = this;
        WsAdapter.socket.getUniqueID = function () {
            /*function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4();*/
            WsAdapter.socketCount++;
            return WsAdapter.socketCount;
        };

        ws.id = WsAdapter.socket.getUniqueID();
        let ipAddress = req.connection.remoteAddress.split(':').pop();
        let existingClient = self.FindClientSocket(ipAddress);

        if (!existingClient)
            WsAdapter.socketClients.push({ socketConn: ws, clientIp: ipAddress, id: ws.id, socketStatus: true, features: new Array() });
        else {
            existingClient.socketConn = ws;
            existingClient.id = ws.id;
            existingClient.socketStatus = true;
        }

        ws.send(JSON.stringify({ id: ws.id, Status: 'Successful' }));

        ws.on('message', function incoming(message) {
            console.log(message);
            ws.send(JSON.stringify({ Response: "Message Received" }));
        });

        ws.on('error', function (e) {
            self.HandleSocketFailure(ws.id);
            console.log("Error in Socket connection " + e.Error);
            return;
        })

        ws.on('close', function (c) {
            self.HandleSocketFailure(ws.id);
            console.log("Socket connection closed " + c.reason);
        });
    }

    private HandleSocketFailure = (id: any) => {
        WsAdapter.socketClients.forEach(item => {
            if (item.id == id)
                item.socketStatus = false;
        });
    }

    private FindClientSocket = (ipAddress: any) => {
        let client = WsAdapter.socketClients.find(item => item.clientIp == ipAddress);
        return client;
    }

    public bindClientConnect(server, callback: (...args: any[]) => void) {
        server.on('connection', callback);
    }

    private sendNotification = (message: any) => {

        WsAdapter.socketClients.forEach(client => {
            if (client.socketStatus) {
                client.socketConn.send(JSON.stringify(message));
            }

        });
    }

    bindMessageHandlers(
        client: WebSocket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        fromEvent(client, 'message')
            .pipe(
                mergeMap(data => this.bindMessageHandler(data, handlers, process)),
                filter(result => !!result),
        )
            .subscribe(response => client.send(JSON.stringify(response)));
    }

    bindMessageHandler(
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        const message = JSON.parse(buffer.data);
        const messageHandler = handlers.find(
            handler => handler.message === message.event,
        );
        if (!messageHandler) {
            return;
        }
        return process(messageHandler.callback(message.data));
    }
}
