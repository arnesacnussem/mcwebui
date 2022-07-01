import Editor, { loader, useMonaco } from '@monaco-editor/react';
import React, { useEffect, useState } from 'react';
import { PageProps } from './Page';
import { MenuItem, Portal, Select, Typography } from '@mui/material';
import { LogViewerConfig } from 'webui-server/config';

loader.config({ paths: { vs: 'vs' } });

export interface LogViewerProps extends PageProps {}

const MonacoViewer = ({ logFile }: { logFile: string }) => {
    const monaco = useMonaco();
    useEffect(() => {
        if (monaco == null) return;
        monaco.editor.getModels();
    }, [monaco]);

    const [content, setContent] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        let interval: NodeJS.Timer | undefined = undefined;
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        fetch(`/api/log/${logFile}`, {
            method: 'get',
            signal: controller.signal,
        }).then((resp) => {
            reader = resp.body?.getReader();
            if (reader) {
                let lastDone = true;
                interval = setInterval(() => {
                    if (!lastDone) return;
                    lastDone = false;
                    reader?.read().then(({ done, value }) => {
                        if (!done) {
                            setContent((prevState) => {
                                lastDone = true;
                                return (
                                    prevState + new TextDecoder().decode(value)
                                );
                            });
                        }
                    });
                }, 10);
            }
        });
        return () => {
            clearInterval(interval);
            controller.abort();
            setContent('');
        };
    }, [logFile]);

    return (
        <Editor
            options={{ readOnly: true }}
            value={content}
            // TODO: 换个语言高亮，现在这个凑合用吧
            defaultLanguage={'javascript'}
            theme={'vs-dark'}
        />
    );
};

const LogViewer = ({ toolbarRef }: LogViewerProps) => {
    const [list, setList] = useState([] as string[]);
    const [file, setFile] = useState(null as string | null);
    const [state, setState] = useState<'loading' | 'emptyList' | 'loaded'>(
        'loading'
    );

    //load log file list
    useEffect(() => {
        fetch('/api/logs')
            .then((r) => r.json())
            .then((cfg: LogViewerConfig) => {
                const _list = Object.keys(cfg.list);
                if (_list.length === 0) {
                    setState('emptyList');
                } else {
                    setList(_list);
                    setFile(cfg.default || _list[0]);
                    setState('loaded');
                }
            });
    }, []);

    return (
        <>
            {toolbarRef ? (
                <Portal container={toolbarRef.current}>
                    <Select
                        value={file}
                        defaultValue={file}
                        onChange={(event) => setFile(event.target.value)}
                    >
                        {list.map((item) => (
                            <MenuItem key={item} value={item}>
                                {item}
                            </MenuItem>
                        ))}
                    </Select>
                </Portal>
            ) : null}
            {(() => {
                switch (state) {
                    default:
                    case 'loading':
                        return <Typography variant={'h1'}>LOADING</Typography>;

                    case 'emptyList':
                        return (
                            <Typography variant={'h1'}>
                                Empty Log File List.
                            </Typography>
                        );

                    case 'loaded':
                        return <MonacoViewer logFile={file!} />;
                }
            })()}
        </>
    );
};

export default LogViewer;
