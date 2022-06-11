import express from 'express';
import expressWs from 'express-ws';
import compression from 'compression';
import { IWebSocket, WSEndpoint } from './websocket.js';
import Daemon from './daemon.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { throttle } from 'throttle-debounce';
import _ from 'lodash';

const { app, getWss } = expressWs(express());
const router = express.Router();
const { ws, getWSS } = IWebSocket(router);
const daemon = Daemon(getWSS);

router.get('/', (_req, res) => {
    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(`${getWss().clients.size}✨${daemon.status}♥${daemon.listeners()}`);
});

router.get('/logs', (req, res) => {
    res.end(JSON.stringify(daemon.config().app.logViewer, null, 2));
});

router.get('/config', (req, res) => {
    res.end(
        JSON.stringify({
            config: daemon.config(),
            spawnOptions: daemon.spawnOptions(),
        })
    );
});

router.get('/log/:file', (req, res) => {
    if (!(req.params.file in daemon.config().app.logViewer.list)) {
        res.statusCode = 404;
        res.end('404');
        return;
    }

    const file = path.join(
        daemon.config().daemon.cwd!,
        daemon.config().app.logViewer.list[req.params.file]
    );
    if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end(`file not found ${file}`);
        return;
    }

    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.flushHeaders();

    let size = 0;
    let failed = false;
    const pipe = throttle(
        300,
        (offset: number) => {
            if (failed) return;
            const buffer: Uint8Array[] = [];
            if (!fs.existsSync(file)) {
                res.statusCode = 503;
                res.end('FILE LOST.');
                return;
            }
            const fStream = fs.createReadStream(file, { start: offset });
            fStream.on('data', (chunk: Buffer) => {
                size += chunk.byteLength;
                buffer.push(chunk);
            });

            fStream.once('end', () => {
                res.write(Buffer.concat(buffer));
                res.flush();
                fStream.removeAllListeners();
                fStream.close();
                failed = false;
            });
        },
        { noLeading: failed, noTrailing: failed }
    );

    pipe(0);
    const watch = fs.watch(file);
    watch.on('change', () => pipe(size));
    res.once('close', () => {
        watch.removeAllListeners();
        watch.close();
        res.removeAllListeners();
        res.end();
    });
});
router.post('/term/resize', (req, res) => {
    res.end(
        JSON.stringify(
            daemon.resize(
                parseInt(req.query.cols as string),
                parseInt(req.query.rows as string)
            )
        )
    );
});
router.get('/daemon/:action', (req, res) => {
    const action = req.params.action as 'start' | 'stop' | 'kill';

    let info = '';
    switch (action) {
        case 'kill':
            info += daemon.stop(false);
            break;
        case 'start':
            info += daemon.start();
            break;
        case 'stop':
            info += daemon.stop();
            break;
    }
    res.end('ok, ' + info);
});

ws(WSEndpoint.DaemonTerminal, daemon.attach);
ws(WSEndpoint.DaemonStatus, (ws) => ws.send(daemon.status()));
const port = (process.env.PORT as number | undefined) || 8000;
const host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';
const dist = _.eq(process.env.NODE_ENV || 'develop', 'PRODUCTION')
    ? path.resolve(process.env.DIST_PATH || './dist')
    : path.resolve(process.cwd(), '../build');

app.use('/api', router);
app.use(express.static(dist));
app.get('*', (req, res) => {
    res.header(200);
    res.sendFile(path.resolve(dist, 'index.html'));
});
app.use(compression());
app.listen(port, host, () =>
    console.log(`listening at http://${host}:${port}/api`)
);
