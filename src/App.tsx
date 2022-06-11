import { Box, Tab, Tabs } from '@mui/material';
import React, { SyntheticEvent, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ConfigPage from './pages/Config';
import Console from './pages/Console';
import LogViewer from './pages/LogViewer';

interface LinkTabProps {
    label: string;
    value: string;
}

const LinkTab = (props: LinkTabProps) => {
    const nav = useNavigate();
    return (
        <Tab
            component="a"
            onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                e.preventDefault();
                nav(props.value);
            }}
            {...props}
        ></Tab>
    );
};

const App = () => {
    const location = useLocation();
    const [value, setValue] = useState(
        location.pathname === '/' ? '/logs' : location.pathname
    );
    const handleChange = (e: SyntheticEvent, nVal: string) => setValue(nVal);
    const toolbarRef = React.useRef(null);
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex' }}>
                <Tabs value={value} onChange={handleChange}>
                    <LinkTab label={'Logs'} value={'/logs'} />
                    <LinkTab label={'Console'} value={'/console'} />
                    <LinkTab label={'Files'} value={'/files'} />
                    <LinkTab label={'Config'} value={'/config'} />
                </Tabs>
                <Box sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex' }} ref={toolbarRef} />
            </Box>
            <Box sx={{ height: '100%' }}>
                <Routes>
                    <Route path={'/'}>
                        <Route
                            index
                            element={<LogViewer toolbarRef={toolbarRef} />}
                        />
                        <Route
                            path={'console'}
                            element={<Console toolbarRef={toolbarRef} />}
                        />
                        <Route path={'files'} />
                        <Route
                            path={'logs'}
                            element={<LogViewer toolbarRef={toolbarRef} />}
                        />
                        <Route path={'config'} element={<ConfigPage />} />
                    </Route>
                </Routes>
            </Box>
        </Box>
    );
};

export default App;
