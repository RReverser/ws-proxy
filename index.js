'use strict';

require('better-log').install({ depth: 4 });

const [, , url, port] = process.argv;

if (!url) {
	throw new Error('Target URL is required');
}

if (!port) {
	throw new Error('Port is required');
}

const WebSocket = require('ws');

let server = new WebSocket.Server({ port });

server.once('listening', () => console.log('Listening...'));

server.on('connection', async (downstream, req) => {
	let upstream = new WebSocket(`${url}${req.url}`);

	let connected = new Promise((resolve, reject) => {
		upstream.once('open', resolve);
		upstream.once('error', reject);
	});

	downstream.on('message', async data => {
		console.log('>', JSON.parse(data));
		connected.then(() => {
			upstream.send(data);
		});
	});

	upstream.on('message', data => {
		console.log('<', JSON.parse(data));
		downstream.send(data);
	});

	downstream.on('error', console.error);
	upstream.on('error', console.error);

	downstream.on('ping', data => upstream.ping(data));
	upstream.on('ping', data => downstream.ping(data));

	downstream.on('pong', data => upstream.pong(data));
	upstream.on('pong', data => downstream.pong(data));

	downstream.once('close', () => upstream.close());
	upstream.once('close', () => downstream.close());

	await connected;

	console.log('Connected to upstream');
});

server.on('error', console.error);
