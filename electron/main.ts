import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

let mainWindow;

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 400,
		height: 525,
		minWidth: 350,
		minHeight: 400,
		webPreferences: { preload: path.join(import.meta.dirname, "preload.js") },
		frame: false,
		resizable: true,
		transparent: true,
		title: "Timer",
	});

	// Hides the file menu from the top
	Menu.setApplicationMenu(null);

	// Listen for the instruction to resize the window in the main svelte file
	ipcMain
		.on("resize-window", (event, arg) => {
			if (mainWindow) {
				let { width, height } = arg;
				// The true flag animates the resize on macOS
				mainWindow.setSize(width, height, true);
				// FOR SOME REASON it resets the minimum size to the set size, so set it back here
				mainWindow.setMinimumSize(350, 400);
			}
		})
		.on("close-window", (event) => {
			if (mainWindow) {
				mainWindow.close();
			}
		}).on("minimize-window", (event) => {
		if (mainWindow) {
			mainWindow.minimize();
			}
		}).on("toggle-resize", (event) => {
			if (mainWindow) {
				mainWindow.resizable = !mainWindow.resizable;
				if(mainWindow.resizable){
					// Reset the window to normal
					mainWindow.setMinimumSize(350, 400);
					mainWindow.setMaximumSize(0, 0);
					mainWindow.setSize(400, 400, true);
					mainWindow.setAlwaysOnTop(false);
				} else {
					// Window small mode
					mainWindow.setMinimumSize(275, 300);
					mainWindow.setMaximumSize(275, 300);
					mainWindow.setSize(275, 300, true);
					mainWindow.setAlwaysOnTop(true);
				}
				return mainWindow.resizable;
			}
		});

	// if i just ignore the errors they can't hurt me
	// Opens dev window if in dev mode, otherwise just loads index.html
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		mainWindow.webContents.on("did-frame-finish-load", () => {
			mainWindow.webContents.openDevTools({ mode: "detach" });
		});
	} else {
		mainWindow.loadFile(path.join(import.meta.dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}
};;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.disableHardwareAcceleration();
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.