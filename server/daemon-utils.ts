import { Config } from './config';
import _ from 'lodash';
import WebSocket from 'ws';
import os from 'os';

export const binaryTransport = os.platform() !== 'win32';
// string message buffering
export const buffer = (ws: WebSocket, timeout: number) => {
    let s = '';
    let sender: NodeJS.Timeout | null = null;
    return (data: string) => {
        s += data;
        if (!sender) {
            sender = setTimeout(() => {
                ws.send(s);
                s = '';
                sender = null;
            }, timeout);
        }
    };
};

// binary message buffering
export const bufferUtf8 = (ws: WebSocket, timeout: number) => {
    let buffer: Uint8Array[] = [];
    let sender: NodeJS.Timeout | null = null;
    let length = 0;
    return (data: Uint8Array) => {
        buffer.push(data);
        length += data.length;
        if (!sender) {
            sender = setTimeout(() => {
                ws.send(Buffer.concat(buffer, length));
                buffer = [];
                sender = null;
                length = 0;
            }, timeout);
        }
    };
};

export const getSpawnOptions = (config: Config) => {
    const options = _.merge(
        {
            name: 'xterm-256color',
            encoding: binaryTransport ? null : 'utf-8',
            env: {
                ...(Object.assign({}, process.env) as {
                    [key: string]: string;
                }),
                COLORTERM: 'truecolor',
                ...config.daemon.extraEnv,
            },
        },
        config.daemon.spawnOptions
    );
    console.log({
        ...options,
        env: config.app.truncateEnv ? 'truncated' : options.env,
    });
    return options;
};
