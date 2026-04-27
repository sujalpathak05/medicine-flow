const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: "Sharma Pharmacy",
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
};

app.whenReady().then(() => {
  app.setAppUserModelId("com.sharmapharmacy.desktop");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
