import * as fsExtra from 'fs-extra';
import type { EcpResponse } from '../RokuDevice';
import { parseEcpResponse } from '../EcpXml';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { utils } from '../utils';
import { RokuDevice } from '../RokuDevice';

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
