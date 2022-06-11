import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import {
    createTheme,
    CssBaseline,
    PaletteMode,
    ThemeProvider,
} from '@mui/material';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        ...(mode === 'dark' && {
            background: {
                default: '#0a1929',
                paper: '#042b36',
            },
        }),
    },
});

root.render(
    <ThemeProvider theme={createTheme(getDesignTokens('dark'))}>
        <CssBaseline>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </CssBaseline>
    </ThemeProvider>
);
