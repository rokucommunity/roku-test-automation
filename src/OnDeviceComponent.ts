import { createRokuDeploySocket } from 'roku-deploy';
import type { RokuDeploySocket } from 'roku-deploy';

import type { RokuDevice } from './RokuDevice';
import type { ConfigOptions } from './types/ConfigOptions';
import { utils } from './utils';
import * as ODC from './types/OnDeviceComponent';

export class OnDeviceComponent {
	public device: RokuDevice;
	private defaultTimeout = 10000;
	private requestHeaderSize = 8;
	private storedDeviceRegistry?: {
		[section: string]: { [sectionItemKey: string]: string }
	};
	private config?: ConfigOptions;
	private activeRequests: { [key: string]: ODC.Request } = {};
	private receivingRequestResponse?: ODC.RequestResponse;
	private clientSocket?: RokuDeploySocket;
	private clientSocketPromise?: Promise<RokuDeploySocket>;

	constructor(device: RokuDevice, config?: ConfigOptions) {
		if (config) {
			this.setConfig(config);
		}
		this.device = device;
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
	 * Get the OnDeviceComponent config from the full RTA config.
	 */
	public getConfig() {
		return this.getRtaConfig()?.OnDeviceComponent;
	}

	//#region requests run on render thread
	/**
	 * Calls a function on a node in the scene graph
	 */
	public async callFunc(args: ODC.CallFuncArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);

		const result = await this.sendRequest(ODC.RequestType.callFunc, args, options);
		return result.json as {
			value: any
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets a value from a component's global AA (associative array) using a key path
	 */
	public async getComponentGlobalAAKeyPath(args: ODC.GetComponentGlobalAAKeyPath, options: ODC.RequestOptions = {}) {
		const callFuncArgs: ODC.CallFuncArgs = {
			...args,
			funcName: 'RTA_componentOperation',
			funcParams: ['getComponentGlobalAAKeyPath', {
				componentGlobalAAKeyPath: args.componentGlobalAAKeyPath
			}]
		};
		delete callFuncArgs['componentGlobalAAKeyPath'];

		const output = await this.callFunc(callFuncArgs, options);

		if (!output) {
			throw new Error('Could not handle getComponentGlobalAAKeyPath request. Make sure you have added the current component xml path to injectFunctionsIntoComponents in your config');
		} else if (output.value.error) {
			throw new Error(output.value.error);
		} else {
			output.value = output.value.result;
		}
		return output;
	}

	/**
	 * Sets a value in a component's global AA using a key path
	 */
	public async setComponentGlobalAAKeyPath(args: ODC.SetComponentGlobalAAKeyPath, options: ODC.RequestOptions = {}) {
		const callFuncArgs: ODC.CallFuncArgs = {
			...args,
			funcName: 'RTA_componentOperation',
			funcParams: ['setComponentGlobalAAKeyPath', {
				componentGlobalAAKeyPath: args.componentGlobalAAKeyPath,
				componentGlobalAAKeyPathValue: args.componentGlobalAAKeyPathValue
			}]
		};
		delete callFuncArgs['componentGlobalAAKeyPath'];
		delete callFuncArgs['componentGlobalAAKeyPathValue'];

		const output = await this.callFunc(callFuncArgs, options);
		if (!output) {
			throw new Error('Could not handle setComponentGlobalAAKeyPath request. Make sure you have added the current component xml path to injectFunctionsIntoComponents in your config');
		} else if (output.value.error) {
			throw new Error(output.value.error);
		} else {
			output.value = output.value.result;
		}
		return output;
	}

	/**
	 * Gets a value from the scene graph at a specified key path
	 */
	public async getValue(args: ODC.GetValueArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);

		const result = await this.sendRequest(ODC.RequestType.getValue, args, options);
		return result.json as {
			found: boolean;
			value?: any;
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets multiple values from the scene graph in a single request
	 */
	public async getValues(args: ODC.GetValuesArgs, options: ODC.RequestOptions = {}) {
		for (const key in args.requests) {
			const requestArgs = args.requests[key];
			this.applySharedKeyPathLogic(requestArgs, options);
		}

		const result = await this.sendRequest(ODC.RequestType.getValues, args, options);
		return result.json as {
			results: {
				[key: string]: {
					found: boolean;
					value?: any;
				}
			}
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets the immediate children (id, subtype, uiElementId) for multiple nodes looked up by elementId.
	 * ArrayGrid subtypes (RowList, MarkupGrid, etc.) return an empty array since their internal
	 * children don't match what app-ui returns.
	 */
	public async getChildrenByElementId(args: ODC.GetChildrenByElementIdArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getChildrenByElementId, args, options);
		return result.json as {
			results: {
				[elementId: string]: {
					subtype: string;
					id: string;
					uiElementId: string;
				}[]
			}
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets detailed information about multiple nodes including their subtypes, fields, and children
	 */
	public async getNodesInfo(args: ODC.GetNodesInfoArgs, options: ODC.RequestOptions = {}) {
		for (const key in args.requests) {
			const requestArgs = args.requests[key];
			this.applySharedKeyPathLogic(requestArgs, options);
		}

		const result = await this.sendRequest(ODC.RequestType.getNodesInfo, args, options);
		return result.json as {
			results: {
				[key: string]: {
					subtype: string;
					fields: {
						[key: string]: {
							fieldType: string;
							type: string;
							value: any;
						}
					};
					children: {
						subtype: string;
					}[]
				}
			}
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Convenience Method to get the currently focused node in the scene graph
	 */
	public async getFocusedNode(args: ODC.GetFocusedNodeArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.getValue({
			base: 'focusedNode'
		}, options);
		return result;
	}

	/**
	 * Checks if a node has focus
	 */
	public async hasFocus(args: ODC.HasFocusArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);

		const result = await this.sendRequest(ODC.RequestType.hasFocus, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json.hasFocus as boolean;
	}

	/**
	 * Checks if a node is in the focus chain
	 */
	public async isInFocusChain(args: ODC.IsInFocusChainArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);

		const result = await this.sendRequest(ODC.RequestType.isInFocusChain, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json.isInFocusChain as boolean;
	}

	/**
	 * Observes a field and returns when it changes once, optionally matching a specific value
	 */
	public async onFieldChangeOnce(args: ODC.OnFieldChangeOnceArgs, options: ODC.RequestOptions = {}) {
		// If observerFireTimeout is not supplied then we default to the timeout
		if (!args.observerFireTimeout) {
			args.observerFireTimeout = this.getTimeOut(options);
		}

		let callback: Parameters<typeof this.onFieldChange>[2] = () => {
			throw new Error('onFieldChangeOnce temporary callback should not be called');
		};

		const promise = new Promise<ODC.OnFieldChangeResponse>((resolve) => {
			callback = async (response: ODC.OnFieldChangeResponse) => {
				// We use whether the response has observerFired to know if this was an actual observer response vs just the observer being set
				if (response.observerFired !== undefined) {
					// TODO add in support for doing match checks here as well

					await this.cancelRequest({ id: response.id });

					// After we cancel the request we return the response
					resolve(response);
				}
			};
		});

		// Wait for observer to be set
		const cancelObserver = await this.onFieldChange(args, options, callback);
		try {
			return await utils.promiseTimeout(promise, args.observerFireTimeout, `onFieldChangeOnce timed out after ${args.observerFireTimeout}ms`);
		} catch (error) {
			// If we timed out we cancel the observer and throw the error
			await cancelObserver();
			throw error;
		}
	}

	/**
	 * Sets up a continuous observer on a field that calls a callback whenever the field changes
	 */
	public async onFieldChange(args: ODC.OnFieldChangeArgs, options: ODC.RequestOptions = {}, callback: (response: ODC.OnFieldChangeResponse) => Promise<void> | void) {
		this.applySharedKeyPathLogic(args, options);
		args = this.breakOutFieldFromKeyPath(args);

		const match = args.match;
		if (match !== undefined) {
			// Check if it's an object. Also have to check constructor as array is also an instanceof Object, make sure it has the keyPath key
			if (((match instanceof Object) && (match.constructor.name === 'Object') && ('keyPath' in match))) {
				this.applySharedKeyPathLogic(match, options);
			} else {
				// If it's not we take base and keyPath from the base, keyPath and field args
				args.match = {
					base: args.base,
					keyPath: args.keyPath,
					field: args.field,
					value: (match as any)
				};
			}
		}

		if (!args.retryInterval) args.retryInterval = 100;

		const deviceConfig = this.device.getCurrentDeviceConfig();
		let retryTimeout: number;

		if (args.retryTimeout !== undefined) {
			retryTimeout = args.retryTimeout;
			// Adding a reasonable amount of time so that we get a more specific error message instead of the generic timeout
			options.timeout = retryTimeout + 200;
		} else {
			retryTimeout = options.timeout ?? deviceConfig.defaultTimeout ?? this.defaultTimeout;
			retryTimeout -= 200;
		}

		const multiplier = deviceConfig.timeoutMultiplier ?? 1;
		retryTimeout *= multiplier;

		args.retryTimeout = retryTimeout;

		//We wait because we need the result of the sendRequest to create the cancelObserverCallback
		const result = await this.sendRequest(ODC.RequestType.onFieldChange, args, options, async (response) => {
			const json = response.json;
			// Using the observerFired key to know if this was an actual response vs just the observer being set
			if (json.observerFired !== undefined) {
				await callback(json);
			}

			// We let script continue on after the observer has been set
			return true;
		});

		//We return the cancel Observer Function to easily cancel the continuous observer
		const cancelObserverFunc = async () => {
			const requestId = result.json.id;
			return await this.cancelRequest({ id: requestId });
		};

		return cancelObserverFunc;
	}

	/**
	 * Sets a value at a specified key path in the scene graph
	 */
	public async setValue(args: ODC.SetValueArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);

		args.convertResponseToJsonCompatible = false;

		const result = await this.sendRequest(ODC.RequestType.setValue, this.breakOutFieldFromKeyPath(args), options);

		return result.json as ODC.ReturnTimeTaken;
	}

	private applySharedKeyPathLogic(args: ODC.BaseKeyPath, options: ODC.RequestOptions) {
		// If no default base was provided we default to scene
		if (!args.base) {
			args.base = (this.getConfig()?.defaultBase) ?? ODC.BaseType.scene;
		}
	}

	/**
	 * Gets the count of all nodes in the scene graph
	 */
	public async getAllCount(args: ODC.GetRootsCountArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getAllCount, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json as {
			totalNodes: number;
			nodeCountByType: { [key: string]: number }
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets the count of root nodes in the scene graph
	 */
	public async getRootsCount(args: ODC.GetRootsCountArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getRootsCount, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json as {
			totalNodes: number;
			nodeCountByType: { [key: string]: number }
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Assigns a unique element ID to all nodes in the scene graph for reference purposes
	 */
	public async assignElementIdOnAllNodes(args: ODC.AssignElementIdOnAllNodesArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.assignElementIdOnAllNodes, { ...args, convertResponseToJsonCompatible: false }, options);
		const output = result.json as ODC.AssignElementIdOnAllNodesResponse;

		return output;
	}

	/**
	 * Finds nodes in the scene graph that match specified property criteria
	 */
	public async getNodesWithProperties(args: ODC.GetNodesWithPropertiesArgs, options: ODC.RequestOptions = {}) {
		// We allow short symbol operators but want to convert to a common format for simpler code on the Roku side
		const operatorConversion: {
			[key: string]: ODC.ComparisonOperators
		} = {
			'=': 'equal',
			'!=': 'notEqual',
			'>': 'greaterThan',
			'>=': 'greaterThanEqualTo',
			'<': 'lessThan',
			'<=': 'lessThanEqualTo'
		};

		for (const property of args.properties) {
			if (!property.operator) {
				// Default to equal if none was provided
				property.operator = 'equal';
			} else if (operatorConversion[property.operator]) {
				// Go ahead and see if need to convert the operator
				property.operator = operatorConversion[property.operator];
			}

			// Convert to standard fields input for the Roku's side
			if (property.field !== undefined) {
				if (property.fields !== undefined) {
					throw new Error('field and fields are mutually exclusive');
				}
				property.fields = [property.field];
				delete property.field;
			}

			if (property.fields === undefined) {
				// Convert to standard keyPaths input for the Roku's side
				if (property.keyPath !== undefined) {
					if (property.keyPaths !== undefined) {
						throw new Error('keyPath and keyPaths are mutually exclusive');
					}
					property.keyPaths = [property.keyPath];
					delete property.keyPath;
				}

				if (property.keyPaths === undefined) {
					throw new Error('No fields or keyPaths provided');
				}
			}
		}

		const result = await this.sendRequest(ODC.RequestType.getNodesWithProperties, args, options);
		return result.json as {
			nodes: ODC.NodeRepresentation[]
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Disables the screen saver
	 */
	public async disableScreenSaver(args: ODC.DisableScreensaverArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.disableScreenSaver, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Sets focus to a specific node
	 */
	public async focusNode(args: ODC.FocusNodeArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.focusNode, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Creates a new child node under a parent node
	 */
	public async createChild(args: ODC.CreateChildArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.createChild, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Removes a node from the scene graph
	 */
	public async removeNode(args: ODC.RemoveNodeArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.removeNode, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Removes all children from a node
	 */
	public async removeNodeChildren(args: ODC.RemoveNodeChildrenArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.removeNodeChildren, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Checks if a node is currently showing on screen and if it's fully visible
	 */
	public async isShowingOnScreen(args: ODC.IsShowingOnScreenArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.isShowingOnScreen, args, options);
		return result.json as ODC.ReturnTimeTaken & {
			isShowing: boolean;
			isFullyShowing: boolean;
		};
	}

	/**
	 * Checks if a node is a subtype of a specified type
	 */
	public async isSubtype(args: ODC.IsSubtypeArgs, options: ODC.RequestOptions = {}) {
		this.applySharedKeyPathLogic(args, options);
		const result = await this.sendRequest(ODC.RequestType.isSubtype, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json.isSubtype as boolean;
	}
	//#endregion

	//#region requests run on task thread
	/**
	 * Reads from the device's registry
	 */
	public async readRegistry(args: ODC.ReadRegistryArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.readRegistry, { ...args, convertResponseToJsonCompatible: false }, options);
		return result.json as {
			values: {
				[section: string]: { [sectionItemKey: string]: string }
			}
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Writes to the device's registry
	 */
	public async writeRegistry(args: ODC.WriteRegistryArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.writeRegistry, args, options);
		return result.json;
	}

	/**
	 * Deletes specified sections from the registry
	 */
	public async deleteRegistrySections(args: ODC.DeleteRegistrySectionsArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.deleteRegistrySections, args, options);
		return result.json;
	}

	/**
	 * Deletes all sections from the registry
	 */
	public async deleteEntireRegistry(args: ODC.DeleteEntireRegistrySectionsArgs = {}, options: ODC.RequestOptions = {}) {
		const deleteSectionsArgs: ODC.DeleteRegistrySectionsArgs = {
			sections: [],
			allowEntireRegistryDelete: true
		};
		return await this.deleteRegistrySections(deleteSectionsArgs, options);
	}

	/**
	 * Gets a list of available volumes on the device
	 */
	public async getVolumeList(args: ODC.GetVolumeListArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getVolumeList, args, options);
		return result.json as {
			list: string[]
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets a list of files and directories at a specified path
	 */
	public async getDirectoryListing(args: ODC.GetDirectoryListingArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getDirectoryListing, args, options);
		return result.json as {
			list: string[]
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Gets file or directory information at a specified path
	 */
	public async statPath(args: ODC.StatPathArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.statPath, args, options);
		const body = result.json;
		// Convert timestamps for easier usage
		body.ctime = new Date(body.ctime * 1000);
		body.mtime = new Date(body.mtime * 1000);
		return body as {
			ctime: Date
			hidden: boolean
			mtime: Date
			permissions: 'rw' | 'r'
			size: number
			sizeex: number
			type: 'file' | 'directory'
		} & ODC.ReturnTimeTaken;
	}

	/**
	 * Creates a new directory at the specified path
	 */
	public async createDirectory(args: ODC.CreateDirectoryArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.createDirectory, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Deletes a file at the specified path
	 */
	public async deleteFile(args: ODC.DeleteFileArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.deleteFile, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Renames a file on the device
	 */
	public async renameFile(args: ODC.RenameFileArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.renameFile, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Reads a file from the device
	 */
	public async readFile(args: ODC.ReadFileArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.readFile, args, options);
		return result as {
			json: ODC.ReturnTimeTaken;
			binaryPayload: Buffer;
		};
	}

	/**
	 * Writes data to a file on the device
	 */
	public async writeFile(args: ODC.WriteFileArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.writeFile, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Gets the application start time using roAppManager.getUptime()
	 */
	public async getApplicationStartTime(args: ODC.GetApplicationStartTimeArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getApplicationStartTime, args, options);
		return result.json as {
			startTime: number
		};
	}

	/**
	 * Gets the client host that the device is communicating with
	 */
	public async getClientHost(args: ODC.GetClientHostArgs = {}, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.getClientHost, args, options);
		return result.json as {
			host: string
		};
	}
	//#endregion

	//#region requests run on both
	/**
	 * Updates OnDeviceComponent settings like log level
	 */
	public async setSettings(args: ODC.SetSettingsArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.setSettings, args, options);
		return result.json as ODC.ReturnTimeTaken;
	}

	/**
	 * Cancels an active request by its ID
	 */
	public async cancelRequest(args: ODC.CancelRequestArgs, options: ODC.RequestOptions = {}) {
		const result = await this.sendRequest(ODC.RequestType.cancelRequest, args, options);

		// If we were successful in canceling the request we remove it from our activeRequests
		delete this.activeRequests[args.id];

		return result.json as ODC.ReturnTimeTaken & {
			success: {
				message: string
			};
		};
	}
	//#endregion


	// In some cases it makes sense to break out the last key path part as `field` to simplify code on the device
	private breakOutFieldFromKeyPath(args: ODC.OnFieldChangeArgs | ODC.SetValueArgs) {
		if (!args.keyPath) {
			args.keyPath = '';
		}

		if (args.field === undefined) {
			const keyPathParts = args.keyPath.split('.');
			return { ...args, field: keyPathParts.pop(), keyPath: keyPathParts.join('.') };
		}

		return args;
	}

	private setupClientSocket(options: ODC.RequestOptions) {
		if (this.clientSocket) {
			return Promise.resolve(this.clientSocket);
		}

		if (this.clientSocketPromise) {
			return this.clientSocketPromise;
		}

		const clientSocketPromise = new Promise<RokuDeploySocket>((resolve, reject) => {
			//TESTING: was 9000; RCE instances only proxy whitelisted ports plus the ephemeral range 49152-65535, and 9000 is not proxied. Must match RTA_OnDeviceComponentTask.brs
			const port = 50_000;
			const rokuDeployDevice = this.device.getRokuDeployDevice();
			const deviceLabel = utils.getDeviceLabel(rokuDeployDevice);
			const timeout = this.getTimeOut(options);
			const startTime = Date.now();

			// Each retry attempt needs its own socket instance (RokuDeploySocket throws if connect() is called twice), so this wires up a fresh socket and its listeners per attempt.
			const connectWithFreshSocket = () => {
				const socket = createRokuDeploySocket({ device: rokuDeployDevice, port: port });

				socket.on('connect', () => {
					this.debugLog(`Connected to Roku at ${deviceLabel} on port ${port}`);
					this.setSettings({
						logLevel: this.getConfig()?.logLevel ?? 'info'
					}, {
						socket: socket
					}).then(() => {
						resolve(socket);
					}, (e) => {
						this.debugLog('Could not set settings', e);
					});
				});

				socket.on('error', async (e) => {
					const errorCode: string = (e as any).code;
					if (errorCode === 'ECONNREFUSED' || errorCode === 'EPIPE') {
						if (Date.now() - startTime > timeout) {
							const error = new Error(`Failed to connect to Roku at ${deviceLabel} on port ${port}. Make sure you have the on device component running on your Roku.`);
							reject(error);
							return;
						}

						this.clientSocket = undefined;
						await utils.sleep(1000);
						this.debugLog('Retrying connection due to: ' + errorCode);
						connectWithFreshSocket();
					} else {
						if (errorCode === 'ETIMEDOUT') {
							this.debugLog(`Failed to connect to Roku at ${deviceLabel} on port ${port}`);
						}
						reject(e);
					}
				});

				socket.on('timeout', () => {
					console.log('socket time out');
				});

				socket.on('drop', () => {
					console.log('socket drop');
				});

				socket.on('close', () => {
					this.clientSocket = undefined;
				});

				socket.on('data', (data) => {
					let offset = 0;
					while (offset < data.length) {
						if (!this.receivingRequestResponse) {
							this.receivingRequestResponse = {
								json: {},
								stringLength: data.readInt32LE(0 + offset),
								binaryLength: data.readInt32LE(4 + offset),
								stringPayload: '',
								binaryPayload: Buffer.alloc(0)
							};
							offset += this.requestHeaderSize;
						}

						// Check if we're still receiving the string payload
						const remainingStringPayload = this.receivingRequestResponse.stringLength - this.receivingRequestResponse.stringPayload.length;
						if (remainingStringPayload > 0) {
							const remainingBufferBytes = data.length - offset;
							if (remainingBufferBytes < remainingStringPayload) {
								this.receivingRequestResponse.stringPayload += data.toString('utf-8', offset, remainingBufferBytes + offset);
								return;
							} else {
								this.receivingRequestResponse.stringPayload += data.toString('utf-8', offset, remainingStringPayload + offset);
								offset += remainingStringPayload;
							}
						}

						const binaryPayload = this.receivingRequestResponse.binaryPayload;
						const remainingBinaryPayload = this.receivingRequestResponse.binaryLength - binaryPayload.length;
						if (remainingBinaryPayload > 0) {
							const remainingBufferBytes = data.length - offset;
							if (remainingBufferBytes < remainingBinaryPayload) {
								const additionalBinaryPayload = data.slice(offset, remainingBufferBytes + offset);
								this.receivingRequestResponse.binaryPayload = Buffer.concat([binaryPayload, additionalBinaryPayload]);
								return;
							} else {
								const additionalBinaryPayload = data.slice(offset, remainingBinaryPayload + offset);
								this.receivingRequestResponse.binaryPayload = Buffer.concat([binaryPayload, additionalBinaryPayload]);
								offset += remainingBinaryPayload;
							}
						}

						const receivingRequestResponse = this.receivingRequestResponse;
						this.receivingRequestResponse = undefined;
						const json = JSON.parse(receivingRequestResponse.stringPayload);

						receivingRequestResponse.json = json;
						if (json.id && this.activeRequests[json.id]) {
							const request = this.activeRequests[json.id];

							if (!request.callback) {
								// Should never happen as we should always have a callback but just in case
								console.error('Request did not have callback');
							} else {
								request.callback(receivingRequestResponse);
							}
						} else {
							this.debugLog('Received response for unknown request:', json);
						}
					}
				});

				this.debugLog(`Attempting to connect to Roku at ${deviceLabel} on port ${port}`);
				socket.connect();
			};

			connectWithFreshSocket();
		});

		this.clientSocketPromise = clientSocketPromise;

		// Attach a no-op catch to the finally()-derived promise so a connect failure doesn't surface as an unhandled rejection; callers still await clientSocketPromise itself and get the original rejection.
		clientSocketPromise.finally(() => {
			this.clientSocketPromise = undefined;
		}).catch(() => { });

		return clientSocketPromise;
	}

	private async sendRequest(type: ODC.RequestType, args: ODC.RequestArgs, options: ODC.RequestOptions = {}, requestorCallback?: (response: ODC.RequestResponse) => Promise<boolean>) {
		const requestId = utils.randomStringGenerator();

		const sentArgs = { ...args };

		this.debugLog(`Sending request ${requestId} of type ${type} with args:`, sentArgs);

		const request: ODC.Request = {
			id: requestId,
			type: type,
			args: sentArgs,
			isRecuring: !!requestorCallback
		};

		let stackTraceError: Error | undefined;
		if (!this.getConfig()?.disableCallOriginationLine) {
			stackTraceError = new Error();
		}

		this.activeRequests[requestId] = request;

		// Have to move our binaryPayload out of the args that will be encoded into JSON
		let binaryBuffer: Buffer | undefined;
		if (utils.isObjectWithProperty(request.args, 'binaryPayload')) {
			binaryBuffer = request.args.binaryPayload as Buffer;
			delete request.args.binaryPayload;
		}

		// We have to remove any non ascii character or else the device will stack overflow due to it only counting the multibyte character as one byte
		const stringPayload = JSON.stringify(request).replace(/[\x00-\x08\x0E-\x1F\x7F-\uFFFF]/g, ''); // eslint-disable-line no-control-regex

		// Build our header buffer with the lengths so we know on the receiving how much data we're expecting for the message before it is considered complete
		const headerBuffer = Buffer.alloc(8);
		headerBuffer.writeInt32LE(stringPayload.length, 0); // Write string payload length

		if (binaryBuffer) {
			headerBuffer.writeInt32LE(binaryBuffer.length, 4); // Write binary payload length
		}

		const requestBuffers = [headerBuffer, Buffer.from(stringPayload, 'utf-8')];
		if (binaryBuffer) {
			requestBuffers.push(binaryBuffer);
		}

		let clientSocket: RokuDeploySocket;
		if (options.socket) {
			clientSocket = options.socket;
		} else {
			clientSocket = await this.setupClientSocket(options);
			this.clientSocket = clientSocket;
		}

		if (this.getConfig()?.restoreRegistry && !this.storedDeviceRegistry) {
			this.debugLog('Storing original device registry state');
			// Have to set a temporary value or else it will loop indefinitely
			this.storedDeviceRegistry = {};
			const result = await this.readRegistry();
			this.storedDeviceRegistry = result.values;
		}

		this.debugLog('Sending request:', stringPayload);
		// Combining into one buffer as it sends separately if we do multiple writes which with TCP could potentially introduce extra latency
		clientSocket.write(Buffer.concat(requestBuffers));

		const promise = new Promise<ODC.RequestResponse>((resolve, reject) => {
			request.callback = async (response) => {
				try {
					const json = response.json;
					this.debugLog('Received response:', json);
					if (json?.error === undefined) {
						if (requestorCallback) {
							if (await requestorCallback(response)) {
								resolve(response);
							}
						} else {
							// Only delete request if there wasn't a callback
							const requestId = json.id;
							this.debugLog(`Deleting request ${requestId}`);

							delete this.activeRequests[requestId];

							resolve(response);
						}
					} else {
						let error: Error;
						if (stackTraceError) {
							error = stackTraceError;
							this.removeOnDeviceComponentFromErrorStack(error);
						} else {
							error = new Error();
						}
						error.message = `${json?.error?.message}`;
						reject(error);
					}
				} catch (e) {
					reject(e);
				}
			};
		});

		const timeout = this.getTimeOut(options);
		try {
			return await utils.promiseTimeout(promise, timeout);
		} catch (e) {
			if ((e as Error).name === 'Timeout') {
				let message = `${request.type} request timed out after ${timeout}ms`;

				if (!this.getConfig()?.disableTelnet) {
					const logs = await this.device.getTelnetLog();
					message += `Log contents:\n${logs}`;
				}
				e.message = message;
			}

			if (stackTraceError) {
				stackTraceError.message = e.message;
				e = stackTraceError;
				this.removeOnDeviceComponentFromErrorStack(e);
			}

			throw e;
		}
	}

	private removeOnDeviceComponentFromErrorStack(error: Error) {
		if (error.stack) {
			const stackParts = error.stack.split('\n');
			const modifiedStackParts = [] as string[];
			for (const stackPart of stackParts) {
				if (stackPart.indexOf('at OnDeviceComponent') === -1) {
					modifiedStackParts.push(stackPart);
				}
			}
			error.stack = modifiedStackParts.join('\n');
		}
		return error;
	}

	private getTimeOut(options: ODC.RequestOptions) {
		const deviceConfig = this.device.getCurrentDeviceConfig();
		let timeout = options?.timeout ?? deviceConfig.defaultTimeout ?? this.defaultTimeout;
		const multiplier = deviceConfig.timeoutMultiplier ?? 1;
		timeout *= multiplier;
		return timeout;
	}

	public async shutdown() {
		this.debugLog(`Shutting down`);

		if (this.storedDeviceRegistry) {
			this.debugLog(`Restoring device registry to original state`);
			await this.writeRegistry({
				values: this.storedDeviceRegistry
			});
		}
		this.clientSocket?.destroy();
		this.clientSocket = undefined;
	}

	private debugLog(message: string, ...args) {
		if (this.getConfig()?.clientDebugLogging) {
			const date = new Date;
			const formattedDate = `${utils.lpad(date.getMonth() + 1)}-${utils.lpad(date.getDate())} ${utils.lpad(date.getHours())}:${utils.lpad(date.getMinutes())}:${utils.lpad(date.getSeconds())}:${utils.lpad(date.getMilliseconds(), 3)}`;
			console.log(`${formattedDate} [ODC][${this.device.getCurrentDeviceConfig().host}] ${message}`, ...args);
		}
	}
}
