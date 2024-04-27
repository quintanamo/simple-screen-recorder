import { app, Menu, BrowserWindow, desktopCapturer, ipcMain, dialog, ipcRenderer } from 'electron';
import fileTypes from './fileTypes.json';
import { Settings } from './types/settings';

const { writeFile } = require('fs');
let config = require('../config.json');

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

const createWindow = (): void => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			nodeIntegration: true,
		},
	});

	// open the app in fullscreen
	mainWindow.maximize();

	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	// populate sources dropdown
	desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async (sources) => {
		mainWindow.webContents.send('populate-sources', sources);
	});

	const menuTemplate = [
		{
			label: 'File',
			submenu: [
				{
					label: 'Settings',
					click: () => {
						createSettingsWindow(mainWindow);
					},
				},
				{
					type: 'separator',
				},
				{
					label: 'Exit',
					click: () => {
						app.quit();
					},
				},
			],
		},
	];

	// @ts-ignore
	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);
};

// create modal window for settings
const createSettingsWindow = (parent: BrowserWindow): void => {
	const child = new BrowserWindow({
		parent: parent,
		modal: true,
		show: false,
		width: 300,
		height: 500,
		resizable: false,
		minimizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	child.removeMenu();
	child.loadFile('src/settings.html');

	child.once('ready-to-show', () => {
		//child.webContents.openDevTools();
		child.webContents.send('populate-settings', config);
		child.show();
	});
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.handle('save-file', async (event, buffer) => {
	console.log(config.fileType);
	const extension = fileTypes.find((t) => t.type === config.fileType).ext;
	const { filePath } = await dialog.showSaveDialog({
		filters: [
			{
				name: extension,
				extensions: [extension],
			},
		],
		buttonLabel: 'Save Video',
		defaultPath: `screen-capture-${Date.now()}.${extension}`,
	});

	if (filePath) {
		await writeFile(filePath, buffer, () => console.log('Video saved.'));
		return true;
	}

	return false;
});

ipcMain.on('save-settings', (event, newConfig) => {
	saveSettings(newConfig);
	config = newConfig;
	ipcRenderer.send('update-config', newConfig);
});

async function saveSettings(settings: Settings): Promise<boolean> {
	try {
		writeFile('./config.json', JSON.stringify(settings), () => console.log('Settings saved.'));
		return true;
	} catch {
		return false;
	}
}
