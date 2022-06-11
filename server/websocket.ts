import expressWs from 'express-ws';
import express from 'express';
import _ from 'lodash';
import WebSocket from 'ws';

export type WSClient = WebSocket & { id: string };

export enum WSEndpoint {
    DaemonTerminal = '/daemon/terminal',
    DaemonStatus = '/daemon/status',
}

export const IWebSocket = (router: expressWs.Router) => {
    const clients: {
        [endpoint: string]: WSClient[];
    } = {};
    const ensureEndpointExist = (endpoint: WSEndpoint) => {
        if (!(endpoint in clients)) {
            clients[endpoint] = [];
        }
    };
    const getWSS = (endpoint: WSEndpoint) => {
        ensureEndpointExist(endpoint);
        return clients[endpoint];
    };
    const ws = (
        endpoint: WSEndpoint,
        callback: (ws: WSClient, req: express.Request) => void
    ) => {
        ensureEndpointExist(endpoint);
        router.ws(endpoint, (ws, req) => {
            const id = `${endpoint}/${Math.random()
                .toString(36)
                .slice(2, 7)
                .toUpperCase()}`;
            const mergedClient = _.merge(ws, { id });
            clients[endpoint].push(mergedClient);
            ws.once('close', () => {
                clients[endpoint] = clients[endpoint].filter(
                    (w) => w.id !== id
                );
            });
            callback(mergedClient, req);
        });
    };
    return { ws, getWSS };
};
