import fs from 'node:fs';
import path from 'node:path';
import { acceptedContent, inputRequired } from '@modelcontextprotocol/server';
import type { InputRequiredResult } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { device, ecp, odc, utils } from '../../dist/index.js';
import type { ConfigOptions } from '../../dist/index.js';
import type { RequestOptions } from '../../src/types/OnDeviceComponent.ts';

const devicePrompt = 'This project has no rta-config.json. Enter the Roku IP address and its developer password. They will be saved to rta-config.json in this project.';

const deviceSchema = z.object({
	host: z.string().trim().min(1).describe('IP address or hostname of the Roku'),
	password: z.string().min(1).describe('Developer password shown on the device')
});

const deviceRequestSchema = {
	type: 'object' as const,
	properties: {
		host: {
			type: 'string' as const,
			title: 'Roku IP address',
			description: 'IP address or hostname of the Roku'
		},
		password: {
			type: 'string' as const,
			title: 'Developer password',
			description: 'Developer password shown on the device'
		}
	},
	required: ['host', 'password']
};

export interface SetupContext {
	mcpReq: {
		inputResponses?: Record<string, unknown>;
		elicitInput(params: {
			message: string;
			requestedSchema: typeof deviceRequestSchema;
		}): Promise<{ action: string; content?: Record<string, unknown> }>;
	};
}

let configured = false;

export function resetSessionForTests() {
	configured = false;
}

export async function ensureConfig(ctx: SetupContext): Promise<InputRequiredResult | undefined> {
	if (configured || process.env.rtaConfig) {
		configured = true;
		return undefined;
	}

	const configPath = configFilePath();
	if (fs.existsSync(configPath)) {
		utils.setupEnvironmentFromConfigFile(configPath);
		configured = true;
		return undefined;
	}

	const saved = acceptedContent(ctx.mcpReq.inputResponses, 'device', deviceSchema);
	if (saved) {
		saveDevice(configPath, saved.host, saved.password);
		return undefined;
	}
	if (ctx.mcpReq.inputResponses && 'device' in ctx.mcpReq.inputResponses) {
		throw new Error('Device setup was cancelled.');
	}

	try {
		const result = await ctx.mcpReq.elicitInput({
			message: devicePrompt,
			requestedSchema: deviceRequestSchema
		});
		if (result.action !== 'accept' || !result.content) {
			throw new Error('Device setup was cancelled.');
		}
		const deviceDetails = deviceSchema.parse(result.content);
		saveDevice(configPath, deviceDetails.host, deviceDetails.password);
		return undefined;
	} catch (error) {
		if (error instanceof Error && error.message.includes('inputRequired')) {
			return inputRequired({
				inputRequests: {
					device: inputRequired.elicit({
						message: devicePrompt,
						requestedSchema: deviceSchema
					})
				}
			});
		}
		if (error instanceof Error && error.message.includes('does not support form elicitation')) {
			throw new Error(`No rta-config.json at ${configPath}, and this client cannot ask for the Roku IP and developer password. Create that file and try again.`);
		}
		throw error;
	}
}

export async function shutdownRta() {
	if (!configured) {
		return;
	}
	await odc.shutdown();
}

export function listDevices() {
	return summarizeDevices(utils.getConfigFromEnvironment());
}

export async function selectDevice(index: number) {
	const config = utils.getConfigFromEnvironment();
	const count = config.RokuDevice.devices.length;
	if (!Number.isInteger(index) || index < 0 || index >= count) {
		throw new Error(`Device index ${index} is outside 0..${count - 1}`);
	}

	await odc.shutdown();
	config.RokuDevice.deviceIndex = index;
	process.env.rtaConfig = JSON.stringify(config);
	device.setConfig(config);
	ecp.setConfig(config);
	odc.setConfig(config);
	return summarizeDevices(config);
}

function configFilePath() {
	return path.resolve(process.env.RTA_CONFIG_PATH ?? 'rta-config.json');
}

function saveDevice(configPath: string, host: string, password: string) {
	const config: ConfigOptions = {
		$schema: 'https://raw.githubusercontent.com/rokucommunity/roku-test-automation/master/rta-config.schema.json',
		RokuDevice: {
			devices: [{ host, password }]
		},
		ECP: {
			default: {
				launchChannelId: 'dev'
			}
		}
	};
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
	utils.setupEnvironmentFromConfigFile(configPath);
	configured = true;
}

function summarizeDevices(config: ConfigOptions) {
	const selectedIndex = config.RokuDevice.deviceIndex ?? 0;
	return {
		selectedIndex,
		launchChannelId: config.ECP?.default?.launchChannelId,
		devices: config.RokuDevice.devices.map((entry, index) => ({
			index,
			label: utils.getDeviceLabel(entry),
			selected: index === selectedIndex,
			properties: entry.properties
		}))
	};
}

export function requestOptions(timeout?: number): RequestOptions {
	return timeout === undefined ? {} : { timeout };
}
