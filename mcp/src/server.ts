import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import type { CallFuncArgs, ComparisonOperators, FocusNodeArgs, GetNodesWithPropertiesArgs, GetValueArgs, OnFieldChangeOnceArgs, ReadRegistryArgs, SetValueArgs } from '../../src/types/OnDeviceComponent.ts';
import { device, ecp, odc } from '../../dist/index.js';
import { compactAppUi, searchAppUi } from './format.ts';
import { ensureConfig, listDevices, requestOptions, selectDevice, type SetupContext } from './session.ts';

const query = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const command = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const setting = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const timeoutField = z.number().int().positive().optional().describe('Request timeout in milliseconds');
const baseField = z.enum(['scene', 'global', 'elementId', 'focusedNode']).optional()
	.describe('Where keyPath starts. Defaults to scene.');
const keyPathField = z.string().optional()
	.describe('Dot path from the base, for example AuthManager.isLoggedIn. A find-node selector needs a leading #, such as 0.#poster.uri.');

const nodeFields = {
	base: baseField,
	keyPath: keyPathField,
	field: z.string().optional().describe('Field name when it is separate from keyPath.'),
	responseMaxChildDepth: z.number().int().min(0).max(20).optional()
		.describe('How many child levels to include when the value is a node. Defaults to 0.')
};

const nodeTarget = z.object(nodeFields);

const keyNames = Object.keys(ecp.Key) as [keyof typeof ecp.Key, ...(keyof typeof ecp.Key)[]];

const keypressOptions = {
	keys: z.array(z.enum(keyNames)).min(1)
		.describe('Remote keys, in order. Ok is Select. Option is the star button.'),
	count: z.number().int().positive().optional().describe('How many times to repeat the sequence. Defaults to 1.'),
	wait: z.number().int().nonnegative().optional().describe('Milliseconds to wait after each key. Uses the config keypressDelay when omitted.')
};

const comparisonOperators = [
	'=', '!=', '>', '>=', '<', '<=', 'in', '!in',
	'equal', 'notEqual', 'greaterThan', 'greaterThanEqualTo', 'lessThan', 'lessThanEqualTo'
] as const satisfies readonly ComparisonOperators[];

type NodeTarget = z.infer<typeof nodeTarget>;

function nodeArgs(args: NodeTarget): GetValueArgs {
	return {
		base: args.base,
		keyPath: args.keyPath,
		field: args.field,
		responseMaxChildDepth: args.responseMaxChildDepth
	};
}

function textResult(value: unknown) {
	const text = value === undefined ? 'ok' : JSON.stringify(value, null, 2);
	return { content: [{ type: 'text' as const, text }] };
}

function errorResult(error: unknown) {
	const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	return { isError: true as const, content: [{ type: 'text' as const, text: message }] };
}

async function attempt(ctx: SetupContext, work: () => Promise<unknown>) {
	try {
		const pending = await ensureConfig(ctx);
		if (pending) {
			return pending;
		}
		return textResult(await work());
	} catch (error) {
		return errorResult(error);
	}
}

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'roku-test-automation',
		version: '0.1.0'
	}, {
		instructions: 'These tools drive the Roku device from rta-config.json in the project. If that file is missing, the first tool asks for the device IP and developer password and saves them there. deploy packages the project and sideloads it, replacing the dev channel. Scene-graph tools require the channel to be running with the OnDeviceComponent. keyPath is a dot path, and a find-node selector starts with #. send_keys, send_text, launch_channel, set_value, call_func, and focus_node change device or app state.'
	});

	server.registerTool('list_devices', {
		title: 'List devices',
		description: 'List the devices in the RTA config, without passwords, and show which one is selected.',
		annotations: query
	}, async (ctx) => attempt(ctx, async () => listDevices()));

	server.registerTool('select_device', {
		title: 'Select device',
		description: 'Use a different device from the RTA config for later calls. Closes the current on-device connection first.',
		annotations: setting,
		inputSchema: z.object({
			index: z.number().int().nonnegative().describe('Zero-based index from list_devices.')
		})
	}, async ({ index }, ctx) => attempt(ctx, () => selectDevice(index)));

	server.registerTool('wait_for_device', {
		title: 'Wait for device',
		description: 'Poll until ECP and the installer web server both respond. Defaults to two minutes.',
		annotations: query,
		inputSchema: z.object({
			timeoutMs: z.number().int().positive().optional().describe('How long to keep polling. Defaults to 120000.'),
			intervalMs: z.number().int().positive().optional().describe('Delay between attempts, also used as the per-request timeout. Defaults to 3000.'),
			graceMs: z.number().int().nonnegative().optional().describe('Delay before the first poll. Use this after a reboot so the old device is not reported as online.')
		})
	}, async ({ timeoutMs, intervalMs, graceMs }, ctx) => attempt(ctx, async () => {
		await device.waitForDeviceOnline(timeoutMs, intervalMs, graceMs);
		return { ok: true };
	}));

	server.registerTool('get_active_app', {
		title: 'Get active app',
		description: 'Read the app and screensaver currently running on the device.',
		annotations: query
	}, async (ctx) => attempt(ctx, () => ecp.getActiveApp()));

	server.registerTool('launch_channel', {
		title: 'Launch channel',
		description: 'Launch or relaunch a channel. Omit channelId to use ECP.default.launchChannelId from the config, usually dev.',
		annotations: command,
		inputSchema: z.object({
			channelId: z.string().optional().describe('Channel id, or dev for the sideloaded channel.'),
			params: z.record(z.string(), z.union([z.string(), z.number()])).optional()
				.describe('Extra launch query parameters, such as contentId and mediaType.'),
			verifyLaunch: z.boolean().optional().describe('Wait until the channel is the active app. Defaults to true.'),
			verifyLaunchTimeout: z.number().int().positive().optional().describe('Milliseconds to wait for verification. Defaults to 3000.')
		})
	}, async ({ channelId, params, verifyLaunch, verifyLaunchTimeout }, ctx) => attempt(ctx, async () => {
		await ecp.sendLaunchChannel({
			channelId,
			params,
			verifyLaunch,
			verifyLaunchTimeOut: verifyLaunchTimeout
		});
		return { ok: true };
	}));

	const fileEntry = z.union([
		z.string(),
		z.object({
			src: z.union([z.string(), z.array(z.string())]).describe('Source file, directory, or glob.'),
			dest: z.string().optional().describe('Path inside the package. Defaults to the source path.')
		})
	]);

	server.registerTool('deploy', {
		title: 'Deploy channel',
		description: 'Package the channel, turn on ENABLE_RTA, inject the OnDeviceComponent files, and sideload it to the selected device. This replaces the dev channel. rootDir defaults to the directory where the server was started.',
		annotations: { ...command, destructiveHint: true },
		inputSchema: z.object({
			rootDir: z.string().optional().describe('Project root containing the manifest, source/, and components/. Defaults to the current directory.'),
			files: z.array(fileEntry).optional().describe('Files to package. Defaults to the standard channel files plus the RTA device files.'),
			injectTestingFiles: z.boolean().optional().describe('Copy the RTA device files into the package and turn on ENABLE_RTA. Defaults to true.'),
			deleteInstalledChannel: z.boolean().optional().describe('Delete the installed dev channel before sideloading. Defaults to true.'),
			appType: z.enum(['channel', 'dcl']).optional().describe('Package type. Defaults to channel.')
		})
	}, async ({ rootDir, files, injectTestingFiles, deleteInstalledChannel, appType }, ctx) => attempt(ctx, async () => {
		await odc.shutdown();
		return device.deploy({ rootDir, files, injectTestingFiles, deleteInstalledChannel, appType });
	}));

	server.registerTool('send_keys', {
		title: 'Send keys',
		description: `Press remote keys in order. Names: ${keyNames.join(', ')}. Ok is the Select button. Option is the star button.`,
		annotations: command,
		inputSchema: z.object(keypressOptions)
	}, async ({ keys, count, wait }, ctx) => attempt(ctx, async () => {
		const sequence = keys.map((key) => ecp.Key[key]);
		const repeats = count ?? 1;
		for (let i = 0; i < repeats; i++) {
			await ecp.sendKeypressSequence(sequence, wait === undefined ? undefined : { wait });
		}
		return { ok: true, keys, count: repeats };
	}));

	server.registerTool('send_text', {
		title: 'Send text',
		description: 'Type text into the focused field by sending one ECP key per character.',
		annotations: command,
		inputSchema: z.object({
			text: z.string().describe('Literal text to enter.'),
			wait: z.number().int().nonnegative().optional().describe('Milliseconds to wait after each character.')
		})
	}, async ({ text, wait }, ctx) => attempt(ctx, async () => {
		await ecp.sendText(text, wait === undefined ? undefined : { wait });
		return { ok: true, length: text.length };
	}));

	server.registerTool('send_input', {
		title: 'Send input',
		description: 'Send an ECP /input request. The channel receives it through roInput.',
		annotations: command,
		inputSchema: z.object({
			params: z.record(z.string(), z.union([z.string(), z.number()]))
				.describe('Query parameters for the input event.')
		})
	}, async ({ params }, ctx) => attempt(ctx, async () => {
		await ecp.sendInput({ params });
		return { ok: true };
	}));

	server.registerTool('get_media_player', {
		title: 'Get media player',
		description: 'Read playback state, position, and duration from the device media player.',
		annotations: query
	}, async (ctx) => attempt(ctx, () => ecp.getMediaPlayer()));

	server.registerTool('get_channel_performance', {
		title: 'Get channel performance',
		description: 'Read the channel CPU and memory stats from ECP chanperf.',
		annotations: query
	}, async (ctx) => attempt(ctx, () => ecp.getChanperf()));

	server.registerTool('get_app_ui', {
		title: 'Get app UI',
		description: 'Read the current channel UI tree. The channel must be running with the OnDeviceComponent. The default result is a compact tree. Set full to true for the raw tree, which can be large.',
		annotations: query,
		inputSchema: z.object({
			full: z.boolean().optional().describe('Return the raw RTA app UI response.'),
			maxDepth: z.number().int().min(0).max(20).optional()
				.describe('How many child levels to include in the compact tree. Defaults to 5.')
		})
	}, async ({ full, maxDepth }, ctx) => attempt(ctx, async () => {
		const ui = await ecp.getAppUI(odc);
		if (full) {
			return ui;
		}
		return compactAppUi(ui, maxDepth ?? 5);
	}));

	server.registerTool('search_app_ui', {
		title: 'Search app UI',
		description: 'Search the complete App-UI tree locally and return only matching nodes, their ancestor hierarchy, and computed scene key paths. Use this instead of get_app_ui(full: true) when locating UI elements.',
		annotations: query,
		inputSchema: z.object({
			query: z.string().min(1).describe('Text to find in App-UI node properties. Matching is case-insensitive substring matching by default.'),
			fields: z.array(z.string()).min(1).optional()
				.describe('Only search these node properties, such as text, id, name, subtype, uri, or keyPath. Omit to search every property except children.'),
			exact: z.boolean().optional().describe('Require the complete property value to equal query. Defaults to false.'),
			caseSensitive: z.boolean().optional().describe('Use case-sensitive matching. Defaults to false.'),
			limit: z.number().int().min(1).max(200).optional().describe('Maximum matching nodes to return. Defaults to 50; matchCount still reports the full count.')
		})
	}, async (options, ctx) => attempt(ctx, async () => {
		const ui = await ecp.getAppUI(odc);
		return searchAppUi(ui, options);
	}));

	server.registerTool('get_focused_node', {
		title: 'Get focused node',
		description: 'Read the scene-graph node that currently has focus. Requires the OnDeviceComponent.',
		annotations: query,
		inputSchema: z.object({ timeout: timeoutField })
	}, async ({ timeout }, ctx) => attempt(ctx, () => odc.getFocusedNode({}, requestOptions(timeout))));

	server.registerTool('get_value', {
		title: 'Get value',
		description: 'Read a scene-graph value at a key path. Requires the OnDeviceComponent.',
		annotations: query,
		inputSchema: nodeTarget.extend({ timeout: timeoutField })
	}, async ({ timeout, ...args }, ctx) => attempt(ctx, () => odc.getValue(nodeArgs(args), requestOptions(timeout))));

	server.registerTool('get_values', {
		title: 'Get values',
		description: 'Read several scene-graph values in one request. requests is a map of result name to a node target.',
		annotations: query,
		inputSchema: z.object({
			requests: z.record(z.string(), nodeTarget),
			timeout: timeoutField
		})
	}, async ({ requests, timeout }, ctx) => attempt(ctx, () => {
		const mapped: Record<string, ReturnType<typeof nodeArgs>> = {};
		for (const [name, request] of Object.entries(requests)) {
			mapped[name] = nodeArgs(request);
		}
		return odc.getValues({ requests: mapped }, requestOptions(timeout));
	}));

	server.registerTool('get_nodes_info', {
		title: 'Get nodes info',
		description: 'Read subtype, fields, and children for one or more nodes. requests is a map of result name to a node target.',
		annotations: query,
		inputSchema: z.object({
			requests: z.record(z.string(), nodeTarget),
			timeout: timeoutField
		})
	}, async ({ requests, timeout }, ctx) => attempt(ctx, () => {
		const mapped: Record<string, ReturnType<typeof nodeArgs>> = {};
		for (const [name, request] of Object.entries(requests)) {
			mapped[name] = nodeArgs(request);
		}
		return odc.getNodesInfo({ requests: mapped }, requestOptions(timeout));
	}));

	server.registerTool('set_value', {
		title: 'Set value',
		description: 'Write a scene-graph field. This changes app state. Requires the OnDeviceComponent.',
		annotations: setting,
		inputSchema: nodeTarget.extend({
			value: z.unknown().describe('Value to write.'),
			timeout: timeoutField
		})
	}, async ({ timeout, value, ...args }, ctx) => attempt(ctx, () => {
		const request: SetValueArgs = { ...nodeArgs(args), value };
		return odc.setValue(request, requestOptions(timeout));
	}));

	server.registerTool('has_focus', {
		title: 'Has focus',
		description: 'Check whether a node currently has focus.',
		annotations: query,
		inputSchema: nodeTarget.extend({ timeout: timeoutField })
	}, async ({ timeout, ...args }, ctx) => attempt(ctx, async () => ({ hasFocus: await odc.hasFocus(nodeArgs(args), requestOptions(timeout)) })));

	server.registerTool('is_in_focus_chain', {
		title: 'Is in focus chain',
		description: 'Check whether a node is in the current focus chain.',
		annotations: query,
		inputSchema: nodeTarget.extend({ timeout: timeoutField })
	}, async ({ timeout, ...args }, ctx) => attempt(ctx, async () => ({
		isInFocusChain: await odc.isInFocusChain(nodeArgs(args), requestOptions(timeout))
	})));

	server.registerTool('focus_node', {
		title: 'Focus node',
		description: 'Move focus to a node, or clear it when on is false.',
		annotations: setting,
		inputSchema: nodeTarget.extend({
			on: z.boolean().optional().describe('Set false to remove focus. Defaults to true.'),
			timeout: timeoutField
		})
	}, async ({ timeout, on, ...args }, ctx) => attempt(ctx, () => {
		const request: FocusNodeArgs = { ...nodeArgs(args), on };
		return odc.focusNode(request, requestOptions(timeout));
	}));

	server.registerTool('find_nodes', {
		title: 'Find nodes',
		description: 'Find scene-graph nodes whose fields match the comparisons. Each comparison needs a field or keyPath and a value.',
		annotations: query,
		inputSchema: z.object({
			properties: z.array(z.object({
				field: z.string().optional(),
				fields: z.array(z.string()).optional(),
				keyPath: z.string().optional(),
				keyPaths: z.array(z.string()).optional(),
				operator: z.enum(comparisonOperators).optional(),
				value: z.union([z.string(), z.number(), z.boolean()])
			})).min(1),
			responseMaxChildDepth: z.number().int().min(0).max(20).optional(),
			timeout: timeoutField
		})
	}, async ({ timeout, ...args }, ctx) => attempt(ctx, () => {
		const request: GetNodesWithPropertiesArgs = args;
		return odc.getNodesWithProperties(request, requestOptions(timeout));
	}));

	server.registerTool('call_func', {
		title: 'Call function',
		description: 'Call a BrightScript function on a scene-graph node. This can change app state. Requires the OnDeviceComponent.',
		annotations: command,
		inputSchema: nodeTarget.extend({
			funcName: z.string().describe('Function name on the target node.'),
			funcParams: z.array(z.unknown()).optional().describe('Arguments passed to the function.'),
			timeout: timeoutField
		})
	}, async ({ timeout, funcName, funcParams, ...args }, ctx) => attempt(ctx, () => {
		const request: CallFuncArgs = { ...nodeArgs(args), funcName, funcParams };
		return odc.callFunc(request, requestOptions(timeout));
	}));

	server.registerTool('on_field_change_once', {
		title: 'Wait for field change',
		description: 'Wait until a scene-graph field changes. When match is set, the call also succeeds if the field already has that value. Defaults to the request timeout, usually 10 seconds.',
		annotations: query,
		inputSchema: nodeTarget.extend({
			match: z.union([z.string(), z.number(), z.boolean()]).optional()
				.describe('Resolve when the field equals this value.'),
			observerFireTimeout: z.number().int().positive().optional().describe('How long to wait for the change, in milliseconds.'),
			retryInterval: z.number().int().positive().optional().describe('How often to recheck while the key path does not exist yet.'),
			retryTimeout: z.number().int().positive().optional().describe('How long to wait for the key path to exist.'),
			timeout: timeoutField
		})
	}, async ({ timeout, ...args }, ctx) => attempt(ctx, () => {
		const request: OnFieldChangeOnceArgs = {
			...nodeArgs(args),
			match: args.match,
			observerFireTimeout: args.observerFireTimeout,
			retryInterval: args.retryInterval,
			retryTimeout: args.retryTimeout
		};
		return odc.onFieldChangeOnce(request, requestOptions(timeout));
	}));

	server.registerTool('read_registry', {
		title: 'Read registry',
		description: 'Read the device registry through the OnDeviceComponent. Omit sections to read everything. Prefer specific sections, because registry values can include app data.',
		annotations: query,
		inputSchema: z.object({
			sections: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional()
				.describe('Section name to a key or list of keys. Omit to read the entire registry.'),
			timeout: timeoutField
		})
	}, async ({ sections, timeout }, ctx) => attempt(ctx, () => {
		const request: ReadRegistryArgs = sections ? { values: sections } : {};
		return odc.readRegistry(request, requestOptions(timeout));
	}));

	server.registerTool('get_screenshot', {
		title: 'Get screenshot',
		description: 'Capture the current device screen and return the image.',
		annotations: query,
		inputSchema: z.object({
			savePath: z.string().optional().describe('Optional file path. The device image extension is appended automatically.')
		})
	}, async ({ savePath }, ctx) => {
		try {
			const pending = await ensureConfig(ctx);
			if (pending) {
				return pending;
			}
			const shot = await device.getScreenshot(savePath);
			const mimeType = shot.format === 'png' ? 'image/png' : 'image/jpeg';
			return {
				content: [
					{
						type: 'text' as const,
						text: JSON.stringify({ format: shot.format, path: shot.path, bytes: shot.buffer.length })
					},
					{
						type: 'image' as const,
						data: shot.buffer.toString('base64'),
						mimeType
					}
				]
			};
		} catch (error) {
			return errorResult(error);
		}
	});

	return server;
}
