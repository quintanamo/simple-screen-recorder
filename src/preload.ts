// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { DesktopCapturerSource, IpcRendererEvent, dialog } from 'electron';

// In the preload script.
const { ipcRenderer } = require('electron');
const { writeFile } = window.require('fs');

let mediaRecorder: MediaRecorder;
let recordedChunks: any[] = [];

ipcRenderer.on('POPULATE_SOURCES', async (event: IpcRendererEvent, sources: DesktopCapturerSource[]) => {
	const sourceDropdown = document.getElementById('dropdown-source');
	const startButton = document.getElementById('btn-start');
	const stopButton = document.getElementById('btn-stop');

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

	startButton.addEventListener('click', () => {
		mediaRecorder.start();
		(<HTMLButtonElement>startButton).disabled = true;
		(<HTMLButtonElement>stopButton).disabled = false;
	});

	stopButton.addEventListener('click', () => {
		mediaRecorder.stop();
		(<HTMLButtonElement>startButton).disabled = false;
		(<HTMLButtonElement>stopButton).disabled = true;
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
				},
			},
		});

		const options = { mimeType: 'video/webm; codecs=vp9' };
		mediaRecorder = new MediaRecorder(stream, options);

		// Register Event Handlers
		mediaRecorder.ondataavailable = handleDataAvailable;
		mediaRecorder.onstop = handleStop;

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

// captures all recorded chunks
function handleDataAvailable(e: any) {
	recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e: any) {
	const blob = new Blob(recordedChunks, {
		type: 'video/webm; codecs=vp9',
	});

	const buffer = Buffer.from(await blob.arrayBuffer());

	let dialogResult: string;
	ipcRenderer
		.invoke('save-file', buffer)
		.then((returnValue) => {
			dialogResult = returnValue;
			console.log(dialogResult, returnValue);
		})
		.then(() => (recordedChunks = []));
}
