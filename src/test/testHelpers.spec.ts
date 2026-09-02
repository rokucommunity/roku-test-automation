import * as fsExtra from 'fs-extra';
import { rokuDeploy } from 'roku-deploy';
import type { EcpResponse } from '../RokuDevice';
import { parseEcpResponse } from '../EcpXml';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { utils } from '../utils';
import { RokuDevice } from '../RokuDevice';
import { device } from '../index';

const repoRootDir = path.resolve(__dirname, '../../');

export function setupTestEnvironment() {
	//load environment variables from a .env file at the root of the repo
	const dotEnvPath = path.resolve(repoRootDir, '.env');
	if (fsExtra.existsSync(dotEnvPath)) {
		dotenv.config({
			path: dotEnvPath,
			override: true,
			processEnv: process.env,
			quiet: true
		});
	}

	const configFilePath = path.resolve(repoRootDir, 'testProject/rta-config.json');
	const config = utils['getConfigFromConfigFileCore'](configFilePath);
	if (process.env.ROKU_RCE_DEVICE_ID && process.env.ROKU_RCE_TOKEN && process.env.ROKU_RCE_PASSWORD) {
		//target a Roku Cloud Emulator device instead of a local one
		config.RokuDevice.devices = [{
			id: Number(process.env.ROKU_RCE_DEVICE_ID),
			rceToken: process.env.ROKU_RCE_TOKEN,
			password: process.env.ROKU_RCE_PASSWORD
		}];
	} else if (process.env.ROKU_HOST && process.env.ROKU_PASSWORD) {
		if (config.RokuDevice?.devices) {
			//override the host and password with environment variables so CI/CD unit tests actually work
			config.RokuDevice.devices = config.RokuDevice.devices.map(x => ({
				...x,
				host: process.env.ROKU_HOST as string,
				password: process.env.ROKU_PASSWORD as string
			}));
		}
	}
	//if we don't have a device address or password, fail here so our tests have better error messages
	const devices = config.RokuDevice?.devices ?? [];
	if (devices.length === 0 || devices.some(x => !(utils.isLocalDeviceConfig(x) || utils.isRceDeviceConfig(x)) || !x.password)) {
		throw new Error(
			`Missing Roku device address and/or password. Set ROKU_HOST and ROKU_PASSWORD (or ROKU_RCE_DEVICE_ID, ROKU_RCE_TOKEN, and ROKU_RCE_PASSWORD for a cloud emulator device) in "${path.join(repoRootDir, '.env')}" or update the host & password in "${configFilePath}".`
		);
	}
	utils.setupEnvironmentFromConfig(config);

	return config;
}

/**
 * Wait for the device to be reachable and responsive by polling both ECP (device-info) and the
 * installer web server (the same `plugin_install` endpoint sideload/publish use) until both respond.
 *
 * ECP alone isn't enough: it can come back before the installer server has finished settling, which
 * shows up as flaky sideload failures even though an ECP check had just reported the device online.
 *
 * @param graceMs how long to wait before the first poll. Use a non-zero value after issuing something
 *   that reboots the device, so we don't immediately see the still-alive pre-reboot device.
 */
export async function waitForDeviceOnline(timeoutMs = 120_000, intervalMs = 3000, graceMs = 0): Promise<void> {
	const startTime = Date.now();
	const deadline = startTime + timeoutMs;
	const rokuDeployDevice = device.getRokuDeployDevice();
	const password = device.getCurrentDeviceConfig().password;

	if (graceMs > 0) {
		await utils.sleep(graceMs);
	}

	let lastError: Error | undefined;
	let count = 0;
	while (Date.now() < deadline) {
		if (count++ > 0) {
			console.log(`[device-health] waiting for device to come online (${Date.now() - startTime}ms elapsed)`);
		}
		try {
			//ensure the ECP webserver is responsive
			await rokuDeploy.getDeviceInfo({ device: rokuDeployDevice, timeout: intervalMs });
			//ensure the plugin_install webserver is responsive
			await rokuDeploy.listSideloadedPlugins({ device: rokuDeployDevice, password: password, timeout: intervalMs });

			//some devices are not fully ready to speak yet, so if this was the result of a long wait,
			//wait a little bit longer
			if (count > 1) {
				console.log('[device-health] device is online, waiting a few more seconds to ensure it is fully ready...');
				await utils.sleep(5_000);
				console.log(`[device-health] device is online after ${Date.now() - startTime}ms`);
			}
			return;
		} catch (e) {
			lastError = e as Error;
			await utils.sleep(intervalMs);
		}
	}
	throw new Error(`Device did not come online within ${timeoutMs}ms. Last error: ${lastError?.message}`);
}

/**
 * Send a couple of Home presses to clear any foreground app/screensaver, so the next test starts from
 * a known state instead of whatever the previous test left on screen.
 */
export async function pressHomeButton(): Promise<void> {
	await device.sendKeyPress('Home');
	await utils.sleep(100);
	await device.sendKeyPress('Home');
	await utils.sleep(100);
}

/**
 * Standard per-test device health gate: make sure the device is actually reachable and responsive,
 * then return it to the home screen. Call this from a `beforeEach` in device suites.
 */
export async function ensureDeviceIsReady(): Promise<void> {
	await waitForDeviceOnline(90_000, 2000, 0);
	await pressHomeButton();
}

/**
 * A RokuDevice subclass for use in unit tests. Lets `instanceof RokuDevice`
 * checks pass without making real network calls. Override or stub `sendEcpPost`
 * / `sendEcpGet` from individual tests as needed.
 */
export class FakeRokuDevice extends RokuDevice {
	public sendEcpPost = (() => Promise.resolve(undefined)) as any;
	public sendEcpGet = (() => Promise.resolve(undefined)) as any;
}

export async function getMock(mockFilePath: string) {
	return await fsExtra.readFile(mockFilePath, 'utf8');
}

export async function getTestMock(contextOrSuiteOrString: Mocha.Context | Mocha.Suite | string, extension: MockFileFormat = 'json'): Promise<object | string> {
	let relativePath: string;

	if (typeof contextOrSuiteOrString === 'string') {
		relativePath = `${contextOrSuiteOrString}.${extension}`;
	} else {
		relativePath = utils.generateFileNameForTest(contextOrSuiteOrString, extension, '', '/');
	}

	const mockFilePath = 'src/test/mocks/' + relativePath;

	const mockContents = await getMock(mockFilePath);
	if (extension === 'json') {
		return JSON.parse(mockContents);
	} else {
		return mockContents;
	}
}

export async function getEcpMockResponse(contextOrSuiteOrString: Mocha.Context | Mocha.Suite | string, status = 200): Promise<EcpResponse> {
	const xml = await getTestMock(contextOrSuiteOrString, 'xml') as string;
	const headers = { 'content-type': 'text/xml; charset="utf-8"' };
	//run the real parser over the xml fixture so specs exercise it and consumers get the parsed body shape
	return { status: status, headers: headers, body: parseEcpResponse({ status: status, body: xml, headers: headers }) };
}

declare type MockFileFormat = 'json' | 'xml';
