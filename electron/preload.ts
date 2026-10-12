const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	// Method to send messages to the main process
	send: (channel: string, data: any) => {
		// Optional: Add a whitelist of valid channels for security
		const validChannels = ["resize-window", "minimize-window", "close-window", "toggle-resize"];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	// Method to receive messages back from the main process (if needed)
	receive: (channel: string, callback: any) => {
		const validChannels = ["window-resized"];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes the `sender`
			ipcRenderer.on(channel, (event: any, ...args: any[]) => callback(...args));
		}
	},
});
