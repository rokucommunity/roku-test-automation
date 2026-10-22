import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from './server.ts';

test('creates a server without connecting to a device', () => {
	const server = createServer();
	assert.equal(typeof server.server, 'object');
});
