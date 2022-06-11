import fs from 'fs';
import _ from 'lodash';
import {
    IPtyForkOptions,
    IWindowsPtyForkOptions,
} from 'node-pty-prebuilt-multiarch';

export interface DaemonConfig {
    cmd: string;
    cwd: string;
    args: string[];
    spawnOptions: IPtyForkOptions | IWindowsPtyForkOptions;
    extraEnv: {
        [key: string]: string;
    };
    graceShutdown: {
        command?: string;
        timeoutSecond: number;
    };
}

export interface AppConfig {
    truncateEnv: boolean;
    console: ConsoleConfig;
    logViewer: LogViewerConfig;
    autoStartDaemon: boolean;
}

export interface LogViewerConfig {
    default?: string;
    list: {
        [key: string]: string;
    };
}

export interface ConsoleConfig {
    bufferLimit: number;
}

export interface Config {
    app: AppConfig;
    daemon: DaemonConfig;
}

export const loadConfig = (): Config => {
    const config = JSON.parse(
        fs.readFileSync(process.env.CONFIG_PATH || './config.json').toString()
    ) as Partial<Config>;
    if (_.isNil(config.daemon?.args)) {
        console.error('args is not defined, will launch with empty args.');
    }

    if (_.isNil(config?.daemon?.cmd) || _.isNil(config?.daemon?.cwd)) {
        console.error('cmd or cwd is not defined, exiting...!');
        process.exit(1);
    }
    if (_.isNil(config?.daemon?.graceShutdown?.command)) {
        console.error(
            'grace shutdown command not specified. daemon will not try to shutdown gracefully.'
        );
    }

    if (_.isNil(config?.daemon?.graceShutdown?.timeoutSecond)) {
        console.error(
            'grace shutdown timeout not set, default to 10 (second).'
        );
    }

    const merged: Config = _.merge(
        {
            app: {
                autoStartDaemon: false,
                logViewer: {
                    list: {},
                },
                truncateEnv: true,
                console: {
                    bufferLimit: 16000,
                },
            },
            daemon: {
                args: [],
                cmd: '',
                extraEnv: {},
                cwd: config.daemon?.cwd,
                spawnOptions: {
                    cols: 160,
                    rows: 48,
                    cwd: config.daemon?.cwd,
                },
                graceShutdown: {
                    timeoutSecond: 10,
                },
            },
        } as Config,
        config
    );

    if (
        merged.app.logViewer.default &&
        !(merged.app.logViewer.default in merged.app.logViewer.list)
    ) {
        console.error(
            'Default log file not in log file list, will unset default log file.'
        );

        merged.app.logViewer.default = undefined;
    }

    return merged;
};
