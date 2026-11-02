const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const PORT = 17341; // Keep the origin stable: localStorage saves are tied to host + port.
let server;

function gameDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "game") : path.resolve(__dirname, "..", "dist");
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".bin": "application/octet-stream",
  ".atlas": "text/plain; charset=utf-8",
  ".frag": "text/plain; charset=utf-8",
  ".vert": "text/plain; charset=utf-8",
};

function startServer() {
  const root = path.resolve(gameDir());
  if (!fs.existsSync(path.join(root, "index.html"))) {
    throw new Error("Game build not found. Run pnpm build:app first: " + root);
  }
  server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      return res.end();
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    const file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    let target = file;
    try {
      if (fs.statSync(target).isDirectory()) {
        target = path.join(target, "index.html");
      }
      if (!fs.statSync(target).isFile()) {
        throw new Error("not file");
      }
    } catch {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader("Content-Type", mime[path.extname(target).toLowerCase()] || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const stream = fs.createReadStream(target);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    });
    if (req.method === "HEAD") {
      return res.end();
    }
    stream.pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", resolve);
  });
}

async function createWindow() {
  const origin = `http://127.0.0.1:${PORT}`;
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#101018",
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin + "/")) {
      event.preventDefault();
      if (/^https:\/\//i.test(url)) {
        shell.openExternal(url);
      }
    }
  });
  await win.loadURL(origin + "/");
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();
  } catch (error) {
    const { dialog } = require("electron");
    dialog.showErrorBox("Hidden Epic 실행 오류", String(error));
    app.quit();
  }
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (server) {
    server.close();
  }
});
