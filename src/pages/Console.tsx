import { IconButton, Portal } from '@mui/material';
import { Fragment, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Terminal } from 'xterm';
import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from 'xterm-addon-fit';
import '../../node_modules/xterm/css/xterm.css';
import { PageProps } from './Page';
import { throttle } from 'throttle-debounce';
import useWebSocket from 'react-use-websocket';
import {
    DangerousOutlined,
    PlayArrowOutlined,
    StopOutlined,
} from '@mui/icons-material';
import { DaemonStatus } from 'webui-server/daemon';

const WSBaseURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${
    window.location.hostname
}:${window.location.port}/api`;

enum WSEndpoint {
    DaemonTerminal = 'daemon/terminal',
    DaemonStatus = 'daemon/status',
}

const DaemonControls = () => {
    const { lastMessage } = useWebSocket(
        `${WSBaseURL}/${WSEndpoint.DaemonStatus}`
    );

    const [status, setStatus] = useState<DaemonStatus | undefined>();
    useEffect(() => {
        setStatus(lastMessage?.data);
        console.log(lastMessage?.data);
    }, [lastMessage?.data]);
    return (
        <Fragment>
            <IconButton
                color={'success'}
                onClick={() => {
                    fetch('/api/daemon/start').finally();
                }}
                disabled={
                    status === undefined ||
                    status === 'failed' ||
                    status === 'running' ||
                    status === 'stopping'
                }
            >
                <PlayArrowOutlined />
            </IconButton>
            <IconButton
                color={'warning'}
                onClick={() => {
                    fetch('/api/daemon/stop').finally();
                }}
                disabled={
                    status === undefined ||
                    status === 'failed' ||
                    status === 'stopped' ||
                    status === 'stopping'
                }
            >
                <StopOutlined />
            </IconButton>
            <IconButton
                color={'error'}
                onClick={() => {
                    fetch('/api/daemon/kill').finally();
                }}
                disabled={
                    status === undefined ||
                    status === 'failed' ||
                    status === 'stopped'
                }
            >
                <DangerousOutlined />
            </IconButton>
        </Fragment>
    );
};

const resizeReq = (term: Terminal, fitAddon: FitAddon) => {
    fitAddon.fit();
    fetch(
        '/api/term/resize?' +
            new URLSearchParams({
                cols: String(term.cols),
                rows: String(term.rows),
            }),
        {
            method: 'post',
        }
    )
        .then((r) => r.text())
        .then(console.log);
};

const Console = ({ toolbarRef }: PageProps) => {
    const term = useMemo(() => {
        const ws = new WebSocket(`${WSBaseURL}/${WSEndpoint.DaemonTerminal}`);
        const fitAddon = new FitAddon();
        const attachAddon = new AttachAddon(ws);
        const term = new Terminal({
            convertEol: true,
            fontFamily: `consolas`,
        });
        term.loadAddon(fitAddon);
        term.loadAddon(attachAddon);
        return {
            term,
            ws,
            fitAddon,
            attachAddon,
        };
    }, []);

    const [xtermOpened, setXtermOpened] = useState(false);
    useEffect(() => {
        term.term.open(document.getElementById('xterm')!);
        resizeReq(term.term, term.fitAddon);
        setXtermOpened(true);
    }, [term.fitAddon, term.term, toolbarRef]);

    //resize terminal when viewport size changed
    useLayoutEffect(() => {
        const throttledResize = throttle(
            1000,
            () => resizeReq(term.term, term.fitAddon),
            {
                noTrailing: false,
                noLeading: false,
            }
        );
        window.addEventListener('resize', throttledResize);
        return () => {
            window.removeEventListener('resize', throttledResize);
        };
    }, [term.fitAddon, term.term]);

    return (
        <>
            {xtermOpened && toolbarRef ? (
                <Portal container={toolbarRef.current}>
                    <DaemonControls />
                </Portal>
            ) : null}
            <div id={'xterm'} style={{ flexGrow: 1 }} />
        </>
    );
};

export default Console;
