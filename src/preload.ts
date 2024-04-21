// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { DesktopCapturerSource, IpcRendererEvent } from 'electron';

// In the preload script.
const { ipcRenderer } = require('electron');

ipcRenderer.on('POPULATE_SOURCES', async (event: IpcRendererEvent, sources: DesktopCapturerSource[]) => {
	const sourceDropdown = document.getElementById('dropdown-source');
	for (const source of sources) {
		let opt = document.createElement('option');
		opt.value = source.id;
		opt.textContent = source.name;
		sourceDropdown.appendChild(opt);
	}

	sourceDropdown.addEventListener('change', (e: Event) => {
		const sourceId = (<HTMLSelectElement>e.target).value;
		if (sourceId != null && sourceId != '') {
			handleSetSource(null, sourceId);
		}
	});
});

async function handleSetSource(event: Event, sourceId: string) {
	try {
		const stream = await (navigator.mediaDevices as any).getUserMedia({
			audio: false,
			video: {
				mandatory: {
					chromeMediaSource: 'desktop',
					chromeMediaSourceId: sourceId,
					minWidth: 1280,
					maxWidth: 1280,
					minHeight: 720,
					maxHeight: 720,
				},
			},
		});
		handleStream(stream);
	} catch (e) {
		handleError(e);
	}
}

function handleStream(stream: MediaStream) {
	const video = document.querySelector('video');
	video.srcObject = stream;
	video.onloadedmetadata = () => video.play();
}

function handleError(e: Error) {
	console.log(e);
}
