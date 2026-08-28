import * as chai from 'chai';
const expect = chai.expect;

import { RokuDevice } from './RokuDevice';
import type { ConfigOptions } from './types/ConfigOptions';

describe('RokuDevice', function () {
	let originalRceTokenEnvironmentVariable: string | undefined;

	beforeEach(() => {
		originalRceTokenEnvironmentVariable = process.env.ROKU_RCE_TOKEN;
		delete process.env.ROKU_RCE_TOKEN;
	});

	afterEach(() => {
		if (originalRceTokenEnvironmentVariable === undefined) {
			delete process.env.ROKU_RCE_TOKEN;
		} else {
			process.env.ROKU_RCE_TOKEN = originalRceTokenEnvironmentVariable;
		}
	});

	describe('getRokuDeployDevice', () => {
		function buildDevice(config: ConfigOptions) {
			return new RokuDevice(config);
		}

		it('uses the device level rceToken over the root config and environment variable', () => {
			process.env.ROKU_RCE_TOKEN = 'env-token';
			const device = buildDevice({
				rceToken: 'root-token',
				RokuDevice: {
					devices: [{ id: 1, password: 'password', rceToken: 'device-token' }]
				}
			});
			expect(device.getRokuDeployDevice()).to.eql({ id: 1, rceToken: 'device-token' });
		});

		it('uses the root config rceToken over the environment variable when the device does not define one', () => {
			process.env.ROKU_RCE_TOKEN = 'env-token';
			const device = buildDevice({
				rceToken: 'root-token',
				RokuDevice: {
					devices: [{ id: 1, password: 'password' }]
				}
			});
			expect(device.getRokuDeployDevice()).to.eql({ id: 1, rceToken: 'root-token' });
		});

		it('falls back to the environment variable when neither config level defines an rceToken', () => {
			process.env.ROKU_RCE_TOKEN = 'env-token';
			const device = buildDevice({
				RokuDevice: {
					devices: [{ id: 1, password: 'password' }]
				}
			});
			expect(device.getRokuDeployDevice()).to.eql({ id: 1, rceToken: 'env-token' });
		});

		it('returns an undefined rceToken when no token is provided anywhere', () => {
			const device = buildDevice({
				RokuDevice: {
					devices: [{ id: 1, password: 'password' }]
				}
			});
			expect(device.getRokuDeployDevice()).to.eql({ id: 1, rceToken: undefined });
		});
	});
});
