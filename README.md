# WebUI for my Minecraft server

[![https://badgen.net/github/tag/micromatch/micromatch](https://badgen.net/github/tag/arnesacnussem/mcwebui)](https://hub.docker.com/r/sacnussem/mcwebui)
[![build](https://github.com/arnesacnussem/mcwebui/actions/workflows/release.yml/badge.svg)](https://github.com/arnesacnussem/mcwebui/actions/workflows/release.yml)
[![build](https://github.com/arnesacnussem/mcwebui/actions/workflows/docker-image.yml/badge.svg)](https://github.com/arnesacnussem/mcwebui/actions/workflows/docker-image.yml)

This just a simple tool for me to run my minecraft server with a terminal.

⚠️️ This project does **NOT** contain any authentication method.


## Features

-   Log viewer use [Monaco Editor](https://github.com/microsoft/monaco-editor)
-   Terminal use [Xterm.js](https://github.com/xtermjs/xterm.js)
-   [Filebrowser](https://github.com/filebrowser/filebrowser)
-   A simple config viewer use [react-json-view](https://github.com/mac-s-g/react-json-view)
-   A web page use [Material UI](https://mui.com/)


## Usage

```
docker run -dp 8000:8000 \
-v /path/to/your/config.json:/webui/config.json \
-v /path/to/your/server:/server/path/in/your/config \
sacnussem/mcwebui
```

## Config file

Config file is in JSON format, for detailed properties please refer to [config.ts](server/config.ts)
