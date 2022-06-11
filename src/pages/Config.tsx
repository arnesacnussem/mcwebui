import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import ReactJson from 'react-json-view';
import { PageProps } from './Page';

interface ConfigEditorProps extends PageProps {
    control: {
        expanded: boolean;
        onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
    };
    readOnly: boolean;
    content: object;
    name: string;
}

const ConfigEditor = ({
    // readOnly,
    name,
    content,
    control,
}: ConfigEditorProps) => {
    return (
        <Accordion sx={{ width: '100%' }} {...control}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ width: '33%', flexShrink: 0 }}>
                    {name}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <ReactJson
                    sortKeys
                    src={content}
                    theme={'monokai'}
                    quotesOnKeys={false}
                    displayDataTypes={false}
                    style={{
                        wordBreak: 'break-all',
                        fontFamily: 'consolas monospace',
                    }}
                />
            </AccordionDetails>
        </Accordion>
    );
};

const ConfigPage = () => {
    const [expanded, setExpanded] = useState(false as string | false);

    const handleChange =
        (panel: string) =>
        (event: React.SyntheticEvent, isExpanded: boolean) => {
            setExpanded(isExpanded ? panel : false);
        };

    const [list, setList] = useState({} as { [key: string]: object });
    useEffect(() => {
        fetch('/api/config')
            .then((r) => r.json())
            .then((j) => setList(j));
    }, []);
    return (
        <Box sx={{ height: '100%', padding: '16px' }}>
            {Object.keys(list).map((key) => (
                <ConfigEditor
                    readOnly
                    key={key}
                    name={key}
                    content={list[key]}
                    control={{
                        expanded: expanded === key,
                        onChange: handleChange(key),
                    }}
                />
            ))}
        </Box>
    );
};
export default ConfigPage;
