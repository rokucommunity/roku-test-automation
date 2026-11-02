import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ensureConfig, resetSessionForTests, type SetupContext } from './session.ts';

test('loads an existing rta-config.json without asking for a device', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rta-mcp-'));
	const configPath = path.join(dir, 'rta-config.json');
	fs.writeFileSync(configPath, JSON.stringify({
		RokuDevice: { devices: [{ host: '10.0.0.5', password: 'existing' }] }
	}));
	await withConfigPath(configPath, async () => {
		let asked = false;
		await ensureConfig(fakeContext(async () => {
			asked = true;
			return { action: 'accept', content: { host: '10.0.0.9', password: 'new' } };
		}));
		assert.equal(asked, false);
		assert.match(process.env.rtaConfig ?? '', /10\.0\.0\.5/);
	});
});

test('asks for the device and saves rta-config.json when the project has none', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rta-mcp-'));
	const configPath = path.join(dir, 'rta-config.json');
	await withConfigPath(configPath, async () => {
		await ensureConfig(fakeContext(async () => ({
			action: 'accept',
			content: { host: ' 10.0.0.8 ', password: 'secret' }
		})));
		const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		assert.equal(saved.RokuDevice.devices[0].host, '10.0.0.8');
		assert.equal(saved.RokuDevice.devices[0].password, 'secret');
		assert.equal(fs.statSync(configPath).mode & 0o077, 0);
		assert.match(process.env.rtaConfig ?? '', /10\.0\.0\.8/);
	});
});

test('stops when device setup is cancelled', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rta-mcp-'));
	const configPath = path.join(dir, 'rta-config.json');
	await withConfigPath(configPath, async () => {
		await assert.rejects(
			() => ensureConfig(fakeContext(async () => ({ action: 'decline' }))),
			/Device setup was cancelled/
		);
		assert.equal(fs.existsSync(configPath), false);
	});
});

test('asks again through the newer protocol when a direct prompt is unavailable', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rta-mcp-'));
	const configPath = path.join(dir, 'rta-config.json');
	await withConfigPath(configPath, async () => {
		const pending = await ensureConfig(fakeContext(async () => {
			throw new Error("Return inputRequired({ ... }) from the handler instead");
		}));
		assert.match(JSON.stringify(pending), /Roku IP address/);
	});
});

function fakeContext(elicitInput: SetupContext['mcpReq']['elicitInput']): SetupContext {
	return { mcpReq: { elicitInput } };
}

async function withConfigPath(configPath: string, run: () => Promise<void>) {
	const previousConfig = process.env.rtaConfig;
	const previousPath = process.env.RTA_CONFIG_PATH;
	delete process.env.rtaConfig;
	process.env.RTA_CONFIG_PATH = configPath;
	resetSessionForTests();
	try {
		await run();
	} finally {
		restoreEnv('rtaConfig', previousConfig);
		restoreEnv('RTA_CONFIG_PATH', previousPath);
		resetSessionForTests();
		fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
	}
}

function restoreEnv(name: 'rtaConfig' | 'RTA_CONFIG_PATH', value: string | undefined) {
	if (value === undefined) {
		delete process.env[name];
	} else {
		process.env[name] = value;
	}
}
