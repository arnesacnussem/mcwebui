import { spawn } from 'node-pty-prebuilt-multiarch';
import { Config } from './config';
import os from 'os';
import path from 'path';
import fs from 'fs';

export const Filebrowser = (config: Config) => {
    const supportUnixSock = os.platform() !== 'win32';
    const address = supportUnixSock ? '/tmp/filebrowser.sock' : '127.0.0.1';

    if (supportUnixSock && fs.existsSync(address)) {
        fs.rmSync(address);
        console.log('previous fb unix socket removed');
    }
    const pty = spawn(
        'filebrowser',
        [
            '--noauth',
            '--disable-exec',
            supportUnixSock ? '--socket' : '--address',
            address,
            '--baseurl',
            '/api/filebrowser',
        ],
        {
            cwd: path.resolve(config.daemon.cwd),
        }
    );
    pty.onExit(({ exitCode }) => {
        console.log(`Filebrowser exited with code ${exitCode}.`);
    });
    pty.onData((d) => {
        console.log('Fb> ' + d);
    });

    return { address, pty };
};
