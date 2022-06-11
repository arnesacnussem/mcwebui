import { loadConfig } from './config.js';
import { WSClient, WSEndpoint } from './websocket.js';
import {
    binaryTransport,
    buffer,
    bufferUtf8,
    getSpawnOptions,
} from './daemon-utils.js';
import { IPty, spawn } from 'node-pty-prebuilt-multiarch';
import EventEmitter from 'events';
import _ from 'lodash';

export type DaemonStatus = 'stopped' | 'running' | 'stopping' | 'failed';
export type Sender = ((data: string | Uint8Array) => void) & { id: string };

const daemonMSG = (msg: string): string => {
    const spl = msg.split('\n');
    if (spl.length > 1)
        return spl.map(daemonMSG).map(_.trim).join('\n').concat('\n');
    return `\x1b[38;5;162;48;5;86m [DAEMON] \x1b[0m ${msg.trim()}\n`;
};

const Daemon = (getClient: (endpoint: WSEndpoint) => WSClient[]) => {
    const config = loadConfig();
    const spawnOptions = getSpawnOptions(config);
    const bufferLimit = config.app.console.bufferLimit;

    const emitter = new EventEmitter();
    let proc: IPty | null = null;
    let status: DaemonStatus = 'stopped';
    let consoleBuffer = '';

    const broadcastDaemonMSG = (msg: string) =>
        Object.entries(senders).forEach(([, sender]) => sender(daemonMSG(msg)));

    const broadcastStatusChange = () => {
        const msg = (() => {
            switch (status) {
                case 'running':
                    return 'Daemon Running.';
                case 'stopped':
                    return 'Daemon Stopped.';
                case 'stopping':
                    return 'Daemon Stopping.';
                case 'failed':
                    return 'unable to spawn daemon.';
            }
        })();
        broadcastDaemonMSG(msg);
        getClient(WSEndpoint.DaemonStatus).forEach((c) => c.send(status));
    };

    emitter.on('change', broadcastStatusChange);

    const setStatus = (s: DaemonStatus) => {
        const lastStatus = status;
        status = s;
        if (status === 'stopped') proc = null;
        if (lastStatus !== status) emitter.emit('change');
    };

    let senders: Sender[] = [];

    /**
     * @return
     * true - spawned a process.
     *
     * false - failed to spawn or skipped because status is 'running'.
     */
    const start = () => {
        if (status === 'running') return false;
        try {
            const pty = spawn(
                config.daemon.cmd,
                config.daemon.args,
                spawnOptions
            );
            console.log('Created pty with PID: ' + pty.pid);
            proc = pty;
        } catch (e) {
            setStatus('failed');
            return false;
        }

        proc?.onExit(({ exitCode }) => {
            setStatus('stopped');
            const info = `\n\n process exited with ${exitCode}`;
            console.log(info);
            consoleBuffer += info;
        });
        proc?.onData((d) => {
            consoleBuffer += d;
            if (consoleBuffer.length > 4 * bufferLimit) {
                consoleBuffer = consoleBuffer.substring(
                    consoleBuffer.length - bufferLimit
                );
            }
            senders.forEach((s) => s(d));
        });
        setStatus('running');
        return true;
    };

    const kill = () => {
        try {
            proc?.kill();
        } catch (e) {
            console.log('1');
            try {
                proc?.kill('SIGKILL');
            } catch (e) {
                console.error('Unable to kill process...');
            }
        }
    };

    /**
     *
     * @param grace
     * do we need it graceful shutdown? Or we just want kill it?
     *
     * @return
     * true - we've tried.
     *
     * false - skipped because current status is 'stopped'
     */
    const stop = (grace?: boolean) => {
        if (status === 'stopping') return false;
        if (status === 'stopped') return false;
        if (grace && _.isNil(config.daemon.graceShutdown.command)) {
            console.error(
                'Unable to grace shutdown due to config.daemon.graceShutdown.command not set!'
            );
            grace = false;
        }
        setStatus('stopping');
        if (grace) {
            console.log(`grace shutdown the daemon: ${proc?.pid}`);
            proc?.write(config.daemon.graceShutdown.command!);
            setTimeout(() => {
                kill();
            }, config.daemon.graceShutdown.timeoutSecond * 1000);
        } else {
            kill();
        }
        return true;
    };
    const readLog = (readAll?: boolean) => {
        return readAll
            ? consoleBuffer
            : consoleBuffer.substring(consoleBuffer.length - bufferLimit);
    };

    const attach = (ws: WSClient) => {
        const sender = _.merge(
            (binaryTransport ? bufferUtf8(ws, 5) : buffer(ws, 5)) as Sender,
            { id: ws.id }
        );

        sender(daemonMSG(`connected\nDaemon ${status}.`));
        sender(readLog());
        senders.push(sender);

        // read from ws, send to pty
        ws.on('message', (d: string) => proc?.write(d));

        ws.once('close', () => {
            ws.removeAllListeners();
            senders = senders.filter((s) => s.id !== ws.id);
        });
    };

    const resize = (cols: number, rows: number) => {
        if (status === 'stopped') {
            spawnOptions.cols = cols;
            spawnOptions.rows = rows;
        }
        proc?.resize(cols, rows);
        return proc
            ? {
                  cols: proc.cols,
                  rows: proc.rows,
              }
            : {
                  cols: spawnOptions.cols,
                  rows: spawnOptions.rows,
              };
    };

    if (config.app.autoStartDaemon) {
        let countDown = 5;
        const interval = setInterval(() => {
            broadcastDaemonMSG(`Daemon will start in ${countDown--} second.`);
            if (countDown === 0) {
                clearInterval(interval);
                start();
            }
        }, 1000);
    }

    return {
        attach,
        status: () => status,
        start,
        stop,
        config: () => config,
        spawnOptions: () => spawnOptions,
        resize,
        listeners: () => emitter.listeners('change').length,
    };
};

export default Daemon;
