import { rokuDeploy, DefaultFiles, createRokuDeploySocket } from 'roku-deploy';
import type { DeviceConfig, EcpResult, RokuDeployOptions } from 'roku-deploy';
import * as fsExtra from 'fs-extra';
import * as querystring from 'querystring';
import type { ConfigOptions } from './types/ConfigOptions';
import { utils } from './utils';
import type * as mocha from 'mocha';
import { parseEcpResponse } from './EcpXml';

export interface HttpRequestOptions {
	/** How many times to retry the request before throwing an error. Defaults to 3 if not specified */
	retryCount?: number;
}

export class RokuDevice {
	public deployed = false;
	private config?: ConfigOptions;

	constructor(config?: ConfigOptions) {
		if (config) {
			this.setConfig(config);
		}
	}

	public setConfig(config: ConfigOptions) {
		utils.validateRTAConfigSchema(config);
		this.config = config;
	}

	/**
	 * Get the full RTA config
	 */
	public getRtaConfig() {
		if (!this.config) {
			this.config = utils.getConfigFromEnvironmentOrConfigFile();
		}
		return this.config;
	}

	/**
	 * Get the RokuDevice config from the full RTA config.
	 */
	public getConfig() {
		return this.getRtaConfig()?.RokuDevice;
	}

	public getCurrentDeviceConfig() {
		const configSection = this.getConfig();
		return configSection.devices[configSection.deviceIndex ?? 0];
	}

	/** Build the roku-deploy device config for the selected device. */
	public getRokuDeployDevice(): DeviceConfig {
		const deviceConfig = this.getCurrentDeviceConfig();
		if (deviceConfig.host) {
			return { host: deviceConfig.host };
		}
		if (deviceConfig.id !== undefined) {
			return { id: deviceConfig.id, rceToken: deviceConfig.rceToken };
		}
		if (deviceConfig.esn) {
			return { esn: deviceConfig.esn, rceToken: deviceConfig.rceToken };
		}
		if (deviceConfig.instanceUrl) {
			return { instanceUrl: deviceConfig.instanceUrl, rceToken: deviceConfig.rceToken };
		}
		throw utils.makeError('InvalidDeviceConfigError', 'Device config must specify a host, id, esn, or instanceUrl');
	}

	public async deploy(options?: DeployOptions, beforeZipCallback?: (info: BeforeZipCallbackInfo) => void) {
		const { zipPath } = await this.createPackage(options, beforeZipCallback);
		const result = await this.publish(options, zipPath);
		this.deployed = true;
		return result;
	}

	public async createPackage(options?: CreatePackageOptions, beforeZipCallback?: (info: BeforeZipCallbackInfo) => void) {
		const injectTestingFiles = options?.injectTestingFiles !== false;

		let files = options?.files;
		if (injectTestingFiles) {
			// stage() only defaults files when the key is omitted, so seed from DefaultFiles before appending
			files = [...(files ?? DefaultFiles), {
				src: `${utils.getDeviceFilesPath()}/**/*`,
				dest: '/'
			}];
		}

		const { stagingDir } = await rokuDeploy.stage({
			rootDir: options?.rootDir,
			files: files
		});

		// Manifest modification
		const manifestPath = `${stagingDir}/manifest`;
		const manifestContents = fsExtra.readFileSync(manifestPath, 'utf-8').replace('ENABLE_RTA=false', 'ENABLE_RTA=true');
		fsExtra.writeFileSync(manifestPath, manifestContents);

		// update the xml components that we are injecting into
		const helperInjection = this.getRtaConfig()?.OnDeviceComponent?.helperInjection;
		if (helperInjection && helperInjection.enabled !== false) {
			for (const path of helperInjection.componentPaths) {
				const xmlComponentContents = fsExtra.readFileSync(`${stagingDir}/${path}`, 'utf-8');
				const updatedContents = this.injectRtaHelpersIntoComponentContents(xmlComponentContents);
				fsExtra.writeFileSync(`${stagingDir}/${path}`, updatedContents);
			}
		}

		const info: BeforeZipCallbackInfo = { stagingDir: stagingDir };
		if (beforeZipCallback) {
			beforeZipCallback(info);
		}

		const { zipPath } = await rokuDeploy.zip({ dir: stagingDir });
		return { stagingDir: stagingDir, zipPath: zipPath };
	}

	public async publish(options?: DeployOptions, zipPath?: string) {
		const deviceConfig = this.getCurrentDeviceConfig();
		if (!zipPath) {
			zipPath = (await this.createPackage(options)).zipPath;
		}

		return await rokuDeploy.sideload({
			device: this.getRokuDeployDevice(),
			password: deviceConfig.password,
			zip: zipPath,
			deleteDevChannel: (options?.deleteInstalledChannel ?? true) || !!options?.deleteBeforeInstall
		});
	}

	private injectRtaHelpersIntoComponentContents(contents: string) {
		// Find the position where we close the interface
		const searchForString = '</interface>';
		const endInterfacePosition = contents.indexOf(searchForString);

		// Now update the contents with our new injected content. Maintains single line to avoid line numbers getting off
		let updatedContents = contents.substring(0, endInterfacePosition);
		updatedContents += `<function name="RTA_componentOperation" />`;
		updatedContents += searchForString;
		updatedContents += `<script type="text/brightscript" uri="pkg:/components/RTA_helpers.brs" />`;
		updatedContents += contents.substring(endInterfacePosition + searchForString.length);
		return updatedContents;
	}

	public sendEcpPost(path: string, params = {}, options: HttpRequestOptions = {}): Promise<EcpResponse> {
		return this.sendEcp(path, params, 'POST', options);
	}

	public sendEcpGet(path: string, params = {}, options: HttpRequestOptions = {}): Promise<EcpResponse> {
		return this.sendEcp(path, params, 'GET', options);
	}

	public sendKeyPress(key: string, options: HttpRequestOptions = {}): Promise<EcpResult> {
		return this.sendKeyEventToRokuDeploy('keyPress', key, options);
	}

	public sendKeyDown(key: string, options: HttpRequestOptions = {}): Promise<EcpResult> {
		return this.sendKeyEventToRokuDeploy('keyDown', key, options);
	}

	public sendKeyUp(key: string, options: HttpRequestOptions = {}): Promise<EcpResult> {
		return this.sendKeyEventToRokuDeploy('keyUp', key, options);
	}

	// roku-deploy sends the key text as-is (no retry, uri-encoding handled internally); RTA just retries here
	private async sendKeyEventToRokuDeploy(rokuDeployMethod: 'keyPress' | 'keyDown' | 'keyUp', key: string, options: HttpRequestOptions = {}): Promise<EcpResult> {
		let retryCount = options.retryCount;
		if (retryCount === undefined) {
			retryCount = 3;
		}

		try {
			return await rokuDeploy[rokuDeployMethod]({ device: this.getRokuDeployDevice(), key });
		} catch (e) {
			if ((retryCount - 1) > 0) {
				this.debugLog(`${rokuDeployMethod} request for key ${key} failed. Retrying.`);
				// Want to delay retry slightly
				await utils.sleep(50);
				return this.sendKeyEventToRokuDeploy(rokuDeployMethod, key, { ...options, retryCount: retryCount - 1 });
			}
			throw utils.makeError('sendKeyEventError', `${rokuDeployMethod} request for key ${key} failed and no retries left`);
		}
	}

	private async sendEcp(path: string, params = {}, method: 'GET' | 'POST', options: HttpRequestOptions = {}): Promise<EcpResponse> {
		let route = path;
		let retryCount = options.retryCount;
		if (retryCount === undefined) {
			retryCount = 3;
		}

		if (params && Object.keys(params).length) {
			route = `${path}?${querystring.stringify(params)}`;
		}

		let result: EcpResult;
		try {
			result = await rokuDeploy.sendEcpRequest(this.getRokuDeployDevice(), route, { method: method });
		} catch (e) {
			if ((retryCount - 1) > 0) {
				this.debugLog(`ECP request to ${route} failed. Retrying.`);
				// Want to delay retry slightly
				await utils.sleep(50);
				return this.sendEcp(path, params, method, {...options, retryCount: retryCount - 1});
			}
			throw utils.makeError('sendEcpError', `ECP request to ${route} failed and no retries left`);
		}

		//parse outside the try so a malformed response body does not trigger transport retries
		return {
			status: result.status,
			headers: result.headers,
			body: parseEcpResponse(result)
		};
	}

	/**
	 * @param outputFilePath - Where to save the screenshot; the device's image extension is appended automatically.
	 */
	public async getScreenshot(outputFilePath?: string) {
		const result = await rokuDeploy.captureScreenshot({
			device: this.getRokuDeployDevice(),
			password: this.getCurrentDeviceConfig().password,
			out: outputFilePath,
			autoExtension: true
		});
		const format = result.filePath
			? utils['getPath']().extname(result.filePath).slice(1)
			: (result.buffer[0] === 0x89 ? 'png' : 'jpg');
		return {
			format: format,
			buffer: result.buffer,
			path: result.filePath
		};
	}

	public async getTestScreenshot(contextOrSuite: mocha.Context | mocha.Suite, basePath = '', postFix = '', separator = '_') {
		const screenshotPath = utils['getPath']().join(basePath, utils.getTestTitlePath(contextOrSuite).join(separator)) + postFix;
		return await this.getScreenshot(screenshotPath);
	}

	public async getTelnetLog() {
		return new Promise<string>((resolve, reject) => {
			const socket = createRokuDeploySocket({ device: this.getRokuDeployDevice(), port: 8085 });

			let content = '';
			let timeout;
			socket.on('data', (data) => {
				content += String(data);

				// Cancel any previous timeout
				if (timeout) {
					clearTimeout(timeout);
				}

				// We might get more data so have to wait for that to come in before proceeding
				timeout = setTimeout(() => {
					resolve(this.processTelnetLog(content));
					socket.destroy();
				}, 400);
			});

			socket.on('close', () => {
				resolve(this.processTelnetLog(content) + '\nSocket Closed');
				socket.destroy();
			});

			socket.on('error', (e) => {
				reject(e);
				socket.destroy();
			});

			socket.connect();
		});
	}

	private processTelnetLog(content: string) {
		const lines = content.split('\n');
		const splitContents = [] as string[];
		for (const line of lines.reverse()) {
			splitContents.unshift(line);
			if (/------\s+compiling.*------/i.exec(line)) {
				break;
			}
		}
		return `Telnet output from ${utils.getDeviceLabel(this.getRokuDeployDevice())}\n` + splitContents.join('\n');
	}

	private debugLog(message: string, ...args) {
		if (this.getConfig()?.clientDebugLogging) {
			console.log(`[RokuDevice] ${message}`, ...args);
		}
	}
}

export interface EcpResponse {
	/** The http status code of the response, or undefined when the transport produced no response */
	status: number | undefined;
	/** The response headers (lowercased names) */
	headers: Record<string, string | string[]>;
	/** The response body, parsed by content-type: an element tree for xml, an object for json, otherwise the raw string */
	body: any;
}

export interface BeforeZipCallbackInfo {
	/** The staging directory holding the copied files before they are zipped, so callers can modify them */
	stagingDir: string;
}

export type CreatePackageOptions = RokuDeployOptions & {
	/** Inject the RTA testing files into the package. Defaults to true */
	injectTestingFiles?: boolean;
};

export type DeployOptions = CreatePackageOptions & {
	preventMultipleDeployments?: boolean;
	/** Delete the currently installed dev channel before installing */
	deleteInstalledChannel?: boolean;
	deleteBeforeInstall?: boolean; // Remove in v3
};
