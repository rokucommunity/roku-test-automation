import type { DeviceConfig } from 'roku-deploy';
import type * as ODC from './OnDeviceComponent';

export interface ConfigOptions {
	/** strictly for schema validation not used internally */
	$schema?: string;

	/** Allows this config to extend another rta-config.json file */
	extends?: string;

	RokuDevice: RokuDeviceConfigOptions;

	ECP?: ECPConfigOptions;

	OnDeviceComponent?: OnDeviceComponentConfigOptions;

	NetworkProxy?: NetworkProxyOptions;

	/** Shared Roku Cloud Emulator api token applied to any device entry that doesn't define its own. The `ROKU_RCE_TOKEN` environment variable is the final fallback. */
	rceToken?: string;
}

export interface RokuDeviceConfigOptions {
	/** Enable debug logging on the client side */
	clientDebugLogging?: boolean;

	devices: DeviceConfigOptions[];

	/** zero based index of which `devices` index to use. If not provided defaults to 0 */
	deviceIndex?: number;

	/**
	 * Formerly routed RTA's port 80 and ECP requests through a debugging proxy like (127.0.0.1:8888).
	 * @deprecated No longer functional: device HTTP now goes through roku-deploy, which has no proxy support. Use the NetworkProxy class to inspect device-originated traffic.
	 */
	proxy?: string;
}

export type DeviceConfigOptions = DeviceConfig & {
	/** The password for logging in to the developer portal on the target Roku device */
	password: string;

	/** If not overridden at the call site how long to wait before assuming a request failed */
	defaultTimeout?: number;

	/** Multiplier applied to request timeouts for all requests including those with an explicit value. Can be used in combination with defaultTimeout */
	timeoutMultiplier?: number;

	/** User defined list of properties for this device (name, isLowEnd, etc) */
	properties?: {}; // eslint-disable-line @typescript-eslint/ban-types

	/** Devices default to jpg but if you've changed to png you'll need so supply this */
	screenshotFormat?: 'png' | 'jpg';
}

export interface ECPConfigOptions {
	default?: {
		/** The default keypressDelay to use if not provided at the call site */
		keypressDelay?: number;

		/** The default channel id to launch if one isn't passed in */
		launchChannelId?: string;
	};
}

export interface OnDeviceComponentConfigOptions {
	/** Device side log output level */
	logLevel?: ODC.LogLevels;

	/** Enable debug logging on the client side */
	clientDebugLogging?: boolean;

	/** Allows specifying the default base that will be used if one was not provided in the args for a request */
	defaultBase?: ODC.BaseType;

	/**
	 * Before running any requests will pull the contents of the registry on the device and store it until ODC is shutdown.
	 * At which point it will clear the registry completely and write back the stored registry values that were previously stored.
	 */
	restoreRegistry?: boolean;

	/** We normally pull the telnet logs if the request timed out. If the telnet connection is already in use then this just adds additional noise in the output */
	disableTelnet?: boolean;

	/** We normally try to include the line that the actual ODC call originated from. When not used specifically for testing this isn't needed as much and has a small over head as we have to throw and exception to get the line */
	disableCallOriginationLine?: boolean;

	/** The resolution we will use when specifying pixel values. If not specified defaults to `fhd` */
	uiResolution?: 'fhd' | 'hd';

	/** Used to inject additional helpers to allow additional functionality */
	helperInjection?: {
		/** List of paths to xml components to inject additional helpers into */
		componentPaths: string[],

		/** Gives a simple way to enable or disable helper injection. Defaults to true */
		enabled?: boolean;
	}
}

export interface NetworkProxyOptions {
	/** What port the proxy will run on. If not provided will find one itself */
	port?: number;

	/** Enable debug logging on the client side */
	clientDebugLogging?: boolean;

	/** Useful for visually debugging issues. Use in the format like (http://127.0.0.1:8888). DOES NOT WORK WITH RELATIVE REDIRECTS IN CHARLES!!! */
	forwardProxy?: string;
}
