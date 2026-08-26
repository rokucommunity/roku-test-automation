import type { HttpRequestOptions } from './RokuDevice';
import { RokuDevice } from './RokuDevice';
import type { ActiveAppResponse } from './types/ActiveAppResponse';
import type { ConfigOptions } from './types/ConfigOptions';
import { utils } from './utils';
import type { MediaPlayerResponse } from './types/MediaPlayerResponse';
import type { AppUIResponse, AppUIResponseChild } from './types/AppUIResponse';
import type { OnDeviceComponent } from './OnDeviceComponent';

export enum Key {
	Back = 'Back',
	Backspace = 'Backspace',
	Down = 'Down',
	Enter = 'Enter',
	Forward = 'Fwd',
	Home = 'Home',
	Left = 'Left',
	Ok = 'Select',
	Option = 'Info',
	Play = 'Play',
	Replay = 'InstantReplay',
	Rewind = 'Rev',
	Right = 'Right',
	Search = 'Search',
	Up = 'Up',
	PowerOff = 'PowerOff',
	PowerOn = 'PowerOn'
}

export class ECP {
	//store the import on the class to make testing easier
	private utils = utils;

	private device: RokuDevice;
	private config?: ConfigOptions;

	private raspFileSteps?: string[];

	public static readonly Key = Key;
	public readonly Key = Key;

	/**
	 * For the remainder of 2.X, device can either be a RokuDevice instance or a config object for backwards compability but will be removed in 3.0
	 */
	constructor(device?: RokuDevice | ConfigOptions, config?: ConfigOptions) {
		if (!device) {
			device = new RokuDevice();
		} else if (!(device instanceof RokuDevice)) {
			config = device;
			device = new RokuDevice();
		}

		this.device = device;
		if (config) {
			this.setConfig(config);
		}
	}

	public setConfig(config: ConfigOptions) {
		utils.validateRTAConfigSchema(config);
		this.config = config;
		this.device.setConfig(config);
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
	 * Get the ECP config from the full RTA config.
	 */
	public getConfig() {
		return this.getRtaConfig()?.ECP;
	}

	public async sendText(text: string, options?: SendKeypressOptions & { raspTemplateVariable?: 'script-login' | 'script-password' }) {
		this.addRaspFileStep(`text: ${options?.raspTemplateVariable ?? text}`);
		for (const char of text) {
			const value: any = `LIT_${char}`;
			await this.sendKeypress(value, options);
		}
	}

	public async sendKeyDown(key: Key, keyEventOptions: SendKeyEventOptions = 0, keypressOptions?: SendKeypressOptions) {
		const { eventOptions, pressOptions } = this.normalizeOptions(keyEventOptions, keypressOptions);
		eventOptions.keydown = true;
		eventOptions.keyup = false;
		await this.sendKeyEvent(key, eventOptions, pressOptions);
	}

	public async sendKeyUp(key: Key, keyEventOptions: SendKeyEventOptions = 0, keypressOptions?: SendKeypressOptions) {
		const { eventOptions, pressOptions } = this.normalizeOptions(keyEventOptions, keypressOptions);
		eventOptions.keyup = true;
		eventOptions.keydown = false;
		await this.sendKeyEvent(key, eventOptions, pressOptions);
	}

	public async sendKeyPressAndHold(key: Key, keyEventOptions: SendKeyEventOptions, keypressOptions?: SendKeypressOptions) {
		const { eventOptions, pressOptions } = this.normalizeOptions(keyEventOptions, keypressOptions);
		eventOptions.keydown = true;
		eventOptions.keyup = true;
		await this.sendKeyEvent(key, eventOptions, pressOptions);
	}

	public async sendKeyEvent(key: Key, keyEventOptions: SendKeyEventOptions, keypressOptions?: SendKeypressOptions) {
		const { eventOptions, pressOptions } = this.normalizeOptions(keyEventOptions, keypressOptions);
		const keydown = eventOptions?.keydown;
		const keyup = eventOptions?.keyup;
		const duration = eventOptions.duration;

		if (keydown != keyup || duration) {
			const keypressDelay = this.getConfig()?.default?.keypressDelay;
			let wait = pressOptions?.wait;
			if (!wait && keypressDelay) {
				wait = keypressDelay;
			}

			const encodedKey = encodeURIComponent(key);

			for (let i = 0; i < (pressOptions?.count ?? 1); i++) {
				if (keydown) {
					await this.device.sendEcpPost(`keydown/${encodedKey}`);
				}

				if (duration) {
					await this.utils.sleep(duration);
				}

				if (keyup) {
					await this.device.sendEcpPost(`keyup/${encodedKey}`);
				}

				if (wait) await this.utils.sleep(wait);
			}
		} else {
			await this.sendKeypress(key, pressOptions);
		}
	}

	private normalizeOptions(eventOptions: SendKeyEventOptions, pressOptions: SendKeypressOptions = {}): { eventOptions, pressOptions } {
		if (typeof eventOptions === 'number') {
			eventOptions = {
				duration: eventOptions,
				keydown: true,
				keyup: true
			};
		}

		if (typeof pressOptions === 'number') {
			pressOptions = {
				wait: pressOptions
			};
		}

		return { eventOptions: eventOptions, pressOptions: pressOptions };
	}

	public async sendKeypress(key: Key, options?: SendKeypressOptions) {
		if (typeof options === 'number') {
			options = {
				wait: options
			};
		}

		if (options?.count) {
			return this.sendKeypressSequence([key], options);
		}

		const raspEquivalent = this.convertKeyToRaspEquivalent(key);
		if (raspEquivalent) {
			this.addRaspFileStep(`press: ${raspEquivalent}`);
		}

		await this.device.sendEcpPost(`keypress/${encodeURIComponent(key)}`);

		const keypressDelay = this.getConfig()?.default?.keypressDelay;
		let wait = options?.wait;
		if (!wait && keypressDelay) {
			wait = keypressDelay;
		}

		if (wait) await this.utils.sleep(wait);
	}

	// This method simply runs this.utils.sleep. Added here to allow adding a pause in rasp file commands
	public sleep(milliseconds: number) {
		this.addRaspFileStep(`pause: ${milliseconds / 1000}`);
		return this.utils.sleep(milliseconds);
	}

	private convertKeyToRaspEquivalent(key: Key) {
		switch (key) {
			case Key.Back:
				return 'back';
			case Key.Backspace:
				return console.log('Roku Remote Tool does not handle Backspace ECP request. Skipping');
			case Key.Down:
				return 'down';
			case Key.Enter:
				return console.log('Roku Remote Tool does not handle Enter ECP request. Skipping');
			case Key.Forward:
				return 'forward';
			case Key.Home:
				return 'home';
			case Key.Left:
				return 'left';
			case Key.Ok:
				return 'ok';
			case Key.Option:
				return 'info';
			case Key.Play:
				return 'play';
			case Key.Replay:
				return 'repeat';
			case Key.Rewind:
				return 'reverse';
			case Key.Right:
				return 'right';
			case Key.Up:
				return 'up';
			case Key.Search:
			case Key.PowerOff:
			case Key.PowerOn:
				return console.log(`Roku Remote Tool does not handle ${key} ECP request. Skipping`);
		}
	}

	public async sendKeypressSequence(keys: Key[], options?: SendKeypressOptions) {
		if (typeof options !== 'number') {
			const count = options?.count;
			if (count !== undefined) {
				// Needed to avoid infinite recursion
				delete options?.count;
				const passedInKeys = keys;
				keys = [];
				for (let i = 0; i < count; i++) {
					keys = keys.concat(passedInKeys);
				}
			}
		}

		for (const key of keys) {
			await this.sendKeypress(key, options);
		}
	}

	public async sendLaunchChannel({
		channelId = '',
		params = {},
		verifyLaunch = true,
		verifyLaunchTimeOut = 3000,
		options = {} as HttpRequestOptions
	} = {}) {
		channelId = this.getChannelId(channelId);

		// We always append a param as if none is passed and the application is already running it will not restart the application
		params['RTA_LAUNCH'] = 1;

		await this.device.sendEcpPost(`launch/${channelId}`, params, options);
		if (verifyLaunch) {
			const startTime = new Date();
			while (new Date().valueOf() - startTime.valueOf() < verifyLaunchTimeOut) {
				try {
					if (await this.isActiveApp(channelId)) {
						return;
					}
				} catch (e) { }
				await this.utils.sleep(100);
			}
			throw this.utils.makeError('sendLaunchChannelVerifyLaunch', `Could not launch channel with id of '${channelId}`);
		}
	}

	// Helper for sending a /input request to the device that can be handled via roInput
	public async sendInput({
		params = {},
		options = {} as HttpRequestOptions
	} = {}) {
		await this.device.sendEcpPost(`input`, params, options);
	}

	public async getActiveApp(options: HttpRequestOptions = {}) {
		const result = await this.device.sendEcpGet(`query/active-app`, undefined, options);
		const children = result.body?.children;
		if (!children) throw this.utils.makeError('getActiveAppInvalidResponse', 'Received invalid active-app response from device');

		const response: ActiveAppResponse = {};
		for (const child of children) {
			response[child.name] = {
				...child.attributes,
				title: child.value
			};
		}
		return response;
	}

	/**
	 * Gets the App UI tree from the device, providing detailed information about the currently displayed UI elements.
	 * Non-renderable nodes (Task, Timer, Animation, etc.) that are excluded from the ECP response will be filled in
	 * via ODC, and all key paths use scene base with correct indices.
	 */
	public async getAppUI(odc: OnDeviceComponent) {
		await odc.assignElementIdOnAllNodes({});

		const result = await this.device.sendEcpGet(`query/app-ui`);

		const children = result.body?.children;
		if (!children || children[0].name != 'status' || children[0].value != 'OK' || children[1].name != 'topscreen' || children[1].children[0].name != 'plugin' || children[1].children[1].name != 'screen') {
			throw this.utils.makeError('getAppUIInvalidResponse', 'Received invalid app-ui response from device');
		}

		const screen = children[1].children[1];

		const response: AppUIResponse = {
			plugin: children[1].children[0].attributes,
			screen: {
				focused: screen.attributes.focused == 'true',
				type: screen.attributes.type,
				children: this.convertChildrenForGetAppUI(screen.children)
			}
		};

		const sceneNode = response.screen.children[0];
		sceneNode.base = 'scene';
		sceneNode.keyPath = '';

		await this.fillGapChildren(odc, sceneNode);
		for (const [position, child] of (sceneNode.children ?? []).entries()) {
			this.generateSceneKeyPaths(child, { position: position });
		}

		this.calculateSceneBoundingRects(sceneNode);
		return response;
	}

	private async fillGapChildren(odc: OnDeviceComponent, sceneNode: AppUIResponseChild) {
		const gapParents = this.findGapParents(sceneNode);
		if (gapParents.length === 0) {
			return;
		}

		const elementIds = gapParents.map(parent => parent.uiElementId);

		try {
			const { results } = await odc.getChildrenByElementId({
				requests: elementIds
			});

			for (const gapParent of gapParents) {
				const children = results[gapParent.uiElementId];
				if (children?.length > 0) {
					this.mergeGapChildren(gapParent, children);
				}
			}
		} catch (e) {
			console.error('Failed to fill gap children:', e);
		}
	}

	private convertChildrenForGetAppUI(children: any[], parentIsRowListItem = false) {
		const response: AppUIResponseChild[] = [];

		// If we are a RowListItem then we are removing the duplicate Group returned in addition to the MarkupGrid to avoid confusion
		if (parentIsRowListItem) {
			children.pop(); // Remove the last child which is the Group
		}

		for (const [index, child] of children.entries()) {
			// Do some conversions
			if (child.attributes.name) {
				child.attributes.id = child.attributes.name;
			}

			child.attributes.focusable = (child.attributes.focusable == 'true');
			child.attributes.focused = (child.attributes.focused == 'true');
			child.attributes.visible = (child.attributes.visible !== 'false');
			child.attributes.inheritParentOpacity = (child.attributes.inheritParentOpacity !== 'false');
			child.attributes.inheritParentTransform = (child.attributes.inheritParentTransform !== 'false');

			const opacity = child.attributes.opacity ?? '100';
			child.attributes.opacity = +opacity / 100;

			if (child.attributes.translation) {
				child.attributes.translation = this.convertAppUiArray(child.attributes.translation);
			}

			if (child.attributes.bounds) {
				// If we have bounds then we need to ensure translation is set or else we won't be able to move in the SceneGraph Inspector
				if (!child.attributes.translation) {
					child.attributes.translation = [0, 0];
				}
				child.attributes.bounds = this.convertAppUiArray(child.attributes.bounds);
			}

			const childResponse: AppUIResponseChild = {
				...child.attributes,
				subtype: child.name == 'RenderableNode' ? 'Group' : child.name,
			};

			const totalChildren = child.attributes.children;
			if (totalChildren !== undefined) {
				childResponse.totalChildren = +totalChildren;
			}

			if (Array.isArray(child.children) && child.children.length > 0) {
				childResponse.children = this.convertChildrenForGetAppUI(child.children ?? [], child.name == 'RowListItem');
			} else {
				// The response contains a property named children with the number of children but we are using the same name for the array so want to remove if no children
				delete childResponse.children;
			}

			response.push(childResponse);
		}

		return response;
	}

	private calculateSceneBoundingRects(node: AppUIResponseChild, parent?: AppUIResponseChild, offset: number[] = [0, 0]) {
		if (node.bounds) {
			node.sceneRect = {
				x: node.bounds[0] + offset[0],
				y: node.bounds[1] + offset[1],
				width: node.bounds[2],
				height: node.bounds[3]
			};

			node['offset'] = offset;
		}

		const children = node.children ?? [];

		for (const child of children) {
			let childOffset = offset;

			if (node.subtype === 'RowListItem') {
				if (node.bounds) {
					if (child.subtype !== 'MarkupGrid') {
						// If we aren't the MarkupGrid child then we need to subtract the translation of the MarkupGrid to get the correct offset for the title
						const markupGrid = children[children.length - 1];
						if (markupGrid.subtype !== 'MarkupGrid') {
							// Shouldn't happen but just in case
							console.log('Expected last child of RowListItem to be MarkupGrid');
						} else {
							if (markupGrid.translation) {
								childOffset = [
									childOffset[0],
									childOffset[1] - markupGrid.translation[1]
								];
							}
						}
					}

					childOffset = [
						childOffset[0],
						node.bounds[1] + childOffset[1]
					];
				}
			} else if (node.translation && (node.subtype !== 'MarkupGrid' || parent?.subtype !== 'RowListItem')) {
				// We have to add to offsets from bounds values for correct positioning of MarkupGrid children
				if (parent?.subtype === 'MarkupGrid' && node.bounds) {
					childOffset = [
						node.bounds[0] + childOffset[0],
						node.bounds[1] + childOffset[1]
					];
				} else {
					childOffset = [
						node.translation[0] + childOffset[0],
						node.translation[1] + childOffset[1]
					];
				}
			}

			this.calculateSceneBoundingRects(child, node, childOffset);
		}
	}

	/**
	 * Generates scene-base key paths for the complete tree (after gap-filling).
	 * Uses #id where available, index positions otherwise. Since the tree now includes
	 * all children (including non-renderable), index-based paths are correct.
	 * Non-renderable nodes get scene-base index paths like any other node.
	 */
	public generateSceneKeyPaths(node: AppUIResponseChild, keyPathContext: {
		position: number;
		duplicateIdsFound?: boolean;
		parent?: AppUIResponseChild;
	}, keyPathParts: string[] = []) {
		const currentNodeKeyPathParts = [...keyPathParts];
		let addKeyPath = !node.keyPath;

		if (node.subtype == 'RowListItem') {
			addKeyPath = false;
			currentNodeKeyPathParts.push(keyPathContext.position.toString());
		} else if (keyPathContext.parent?.subtype == 'RowListItem') {
			addKeyPath = false;

			if (keyPathContext.position == 0) {
				currentNodeKeyPathParts.push('title');

				if (node.subtype == 'Label') {
					addKeyPath = true;
				} else {
					const child = node.children?.[0];
					if (child) {
						node.base = 'scene';
						child.keyPath = currentNodeKeyPathParts.join('.');
					}
				}
			} else if (node.subtype === 'MarkupGrid') {
				currentNodeKeyPathParts.push('items');
			}
		} else if (addKeyPath && node.id && !keyPathContext.duplicateIdsFound) {
			currentNodeKeyPathParts.push(`#${node.id}`);
		} else if (addKeyPath) {
			currentNodeKeyPathParts.push(keyPathContext.position.toString());
		}

		if (addKeyPath) {
			node.base = 'scene';
			node.keyPath = currentNodeKeyPathParts.join('.');
		}

		const children = node.children ?? [];
		for (const [childPosition, childNode] of children.entries()) {
			const duplicateIds = children.filter((child, index) => {
				if (child.id) {
					if (child.id == childNode.id && index != childPosition) {
						return true;
					}
				}
				return false;
			});

			keyPathContext = {
				position: childPosition,
				parent: node,
				duplicateIdsFound: duplicateIds.length > 0,
			};

			this.generateSceneKeyPaths(childNode, keyPathContext, currentNodeKeyPathParts);
		}
	}

	/**
	 * Finds all nodes in the tree that have more children on the device than are returned in the app-ui response.
	 * Returns an array of nodes that need gap-filling, each with a uiElementId that can be used to request full children info.
	 * The scene node (keyPath === '') is always included because ECP never reports the correct children count for it.
	 */
	public findGapParents(node: AppUIResponseChild): (AppUIResponseChild & { uiElementId: string })[] {
		const gapParents: (AppUIResponseChild & { uiElementId: string })[] = [];

		const uiElementId = node.uiElementId;
		if (uiElementId) {
			const isSceneNode = node.keyPath === '';
			const hasChildGap = node.totalChildren !== undefined && node.totalChildren > (node.children?.length ?? 0);
			if (isSceneNode || hasChildGap) {
				gapParents.push(node as AppUIResponseChild & { uiElementId: string });
			}
		}

		for (const child of node.children ?? []) {
			gapParents.push(...this.findGapParents(child));
		}

		return gapParents;
	}

	/**
	 * Merges non-Group children into the app-ui tree for nodes that have missing children.
	 * Matches app-ui children to the full children list using id, then uiElementId as fallback for position correlation.
	 * Non-renderable children are inserted at their correct index positions.
	 * @param gapParent The app-ui node that has missing children
	 * @param fullChildrenList The complete list of children from getNodesChildren
	 */
	public mergeGapChildren(gapParent: AppUIResponseChild, fullChildrenList: { subtype: string; id?: string; uiElementId?: string }[]) {
		const appUIChildren = gapParent.children ?? [];

		// Build a lookup of app-ui children by id for fast matching
		const appUIById = new Map<string, AppUIResponseChild>();
		for (const child of appUIChildren) {
			if (child.id) {
				appUIById.set(child.id, child);
			}
		}

		// Also index by uiElementId as a secondary matching strategy
		const appUIByElementId = new Map<string, AppUIResponseChild>();
		for (const child of appUIChildren) {
			if (child.uiElementId) {
				appUIByElementId.set(child.uiElementId, child);
			}
		}

		const merged: AppUIResponseChild[] = [];
		const consumed = new Set<AppUIResponseChild>();

		for (const realChild of fullChildrenList) {
			let match: AppUIResponseChild | undefined = undefined;

			// Fall back to uiElementId matching for position correlation
			if (!match && realChild.uiElementId) {
				match = appUIByElementId.get(realChild.uiElementId);
			}

			if (match && !consumed.has(match)) {
				consumed.add(match);
				merged.push(match);
			} else {
				merged.push({
					base: 'scene',
					keyPath: '',
					subtype: realChild.subtype,
					id: realChild.id,
					uiElementId: realChild.uiElementId
				} as AppUIResponseChild);
			}
		}

		gapParent.children = merged;
	}

	private convertAppUiArray(input?: string, fallback?: number[]) {
		if (!input) {
			return fallback;
		}

		// the app-ui api returns arrays with curly braces that we need to convert to square braces and then run JSON.parse on
		return JSON.parse(input.replace(/[{}]/g, match => match === '{' ? '[' : ']'));
	}

	public getChannelId(channelId?: string) {
		if (!channelId) {
			const configChannelId = this.getConfig()?.default?.launchChannelId;
			if (!configChannelId) {
				throw this.utils.makeError('LaunchChannelIdMissing', 'launchChannelId required and not supplied');
			}
			channelId = configChannelId;
		}
		return channelId;
	}

	public async isActiveApp(channelId?: string, options: HttpRequestOptions = {}) {
		const result = await this.getActiveApp(options);
		return result.app?.id === this.getChannelId(channelId);
	}

	public async getMediaPlayer(options: HttpRequestOptions = {}) {
		const result = await this.device.sendEcpGet(`query/media-player`, undefined, options);
		const player = result.body;
		if (!player) throw this.utils.makeError('getMediaPlayerInvalidResponse', 'Received invalid media-player response from device');

		const response: MediaPlayerResponse = {
			state: player.attributes.state,
			error: player.attributes.error === 'true',
		};

		for (const child of player.children) {
			response[child.name] = {
				...child.attributes,
				value: child.value
			};
		}

		for (const key of ['position', 'duration', 'runtime']) {
			const value = response[key]?.value.replace(' ms', '');
			if (value) {
				response[key].number = utils.convertValueToNumber(value);
			}
		}

		return response;
	}

	public async getChanperf(options: HttpRequestOptions = {}) {
		const result = await this.device.sendEcpGet(`query/chanperf`, undefined, options);

		const response = this.simplifyEcpResponse(result.body);
		const plugin = response.plugin;

		if (plugin) {
			// Convert dashes to camelCase
			plugin.cpuPercent = plugin['cpu-percent'];
			delete plugin['cpu-percent'];

			plugin.cpuPercent.durationSeconds = plugin.cpuPercent['duration-seconds'];
			delete plugin.cpuPercent['duration-seconds'];

			// Convert values to numbers
			response.timestamp = +response.timestamp;

			for (const field of ['cpuPercent', 'memory']) {
				for (const key in plugin[field]) {
					plugin[field][key] = +plugin[field][key];
				}
			}
		}

		return response as {
			timestamp?: number;
			status: 'OK' | 'FAILED'
			error?: string;
			plugin?: {
				id: string;
				cpuPercent: {
					durationSeconds: number;
					user: number;
					sys: number;
				}
				memory: {
					used: number;
					res: number;
					anon: number;
					swap: number;
					file: number;
					shared: number;
				}
			};
		};
	}

	private simplifyEcpResponse(body) {
		const response: any = {};
		for (const child of body.children) {
			if (child.children.length > 0) {
				response[child.name] = this.simplifyEcpResponse(child);
			} else if (child.attributes.length > 0) {
				response[child.name] = {
					...child.attributes,
					value: child.value
				};
			} else {
				response[child.name] = child.value;
			}
		}
		return response;
	}

	private addRaspFileStep(step: string) {
		if (this.raspFileSteps) {
			this.raspFileSteps.push(`    - ${step}`);
		}
	}

	public startRaspFileCreation() {
		this.raspFileSteps = [];
	}

	public finishRaspFileCreation(outputPath: string, defaultKeypressWait?: number) {
		if (!this.raspFileSteps) {
			throw new Error('startRaspFileCreation was not called before finishRaspFileCreation');
		}

		if (defaultKeypressWait === undefined) {
			defaultKeypressWait = this.getConfig()?.default?.keypressDelay;
			if (defaultKeypressWait === undefined) {
				// Default that Roku uses in Remote Tool
				defaultKeypressWait = 2;
			}
		}

		let raspFileLines = [] as string[];
		raspFileLines.push('params:');
		raspFileLines.push('    rasp_version: 1');
		raspFileLines.push(`    default_keypress_wait: ${defaultKeypressWait / 1000}`);
		raspFileLines.push(`steps:`);
		raspFileLines = raspFileLines.concat(this.raspFileSteps);
		this.raspFileSteps = undefined;
		utils.getFsExtra().writeFileSync(outputPath, raspFileLines.join('\n'));
	}
}

/** If value is a number then we convert it to an object with the number used for wait  */
type SendKeypressOptions = number | {
	wait?: number;
	count?: number;
}

/** If value is a number then we convert it to an object with number used for duration and keydown and keyup set */
type SendKeyEventOptions = number | {
	keydown?: boolean;
	keyup?: boolean;
	duration: number;
}
