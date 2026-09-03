import * as chai from 'chai';
const expect = chai.expect;
import * as sinonImport from 'sinon';
const sinon = sinonImport.createSandbox();
import { rokuDeploy } from 'roku-deploy';

import { RokuDevice } from './RokuDevice';
import { utils } from './utils';
import type { ConfigOptions } from './types/ConfigOptions';

/** Await a promise that's expected to reject, and return the error it rejected with */
async function getRejection(promise: Promise<unknown>): Promise<Error> {
	try {
		await promise;
	} catch (e) {
		return e as Error;
	}
	throw new Error('Expected promise to reject, but it resolved');
}

describe('RokuDevice', function () {
	let originalRceTokenEnvironmentVariable: string | undefined;

	beforeEach(() => {
		originalRceTokenEnvironmentVariable = process.env.ROKU_RCE_TOKEN;
		delete process.env.ROKU_RCE_TOKEN;
	});

	afterEach(() => {
		sinon.restore();
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

	describe('waitForDeviceOnline', () => {
		let device: RokuDevice;
		let getDeviceInfoStub: sinonImport.SinonStub;
		let listSideloadedPluginsStub: sinonImport.SinonStub;
		let sleepStub: sinonImport.SinonStub;
		/** every duration passed to `utils.sleep`, in call order */
		let sleeps: number[];

		beforeEach(() => {
			device = new RokuDevice({
				RokuDevice: {
					devices: [{ host: '1.1.1.1', password: 'password' }]
				}
			});
			getDeviceInfoStub = sinon.stub(rokuDeploy, 'getDeviceInfo').resolves({} as any);
			listSideloadedPluginsStub = sinon.stub(rokuDeploy, 'listSideloadedPlugins').resolves([] as any);
			sleeps = [];
			//don't actually sleep, but record what we were asked to sleep for
			sleepStub = sinon.stub(utils, 'sleep').callsFake(((milliseconds: number) => {
				sleeps.push(milliseconds);
				return Promise.resolve();
			}) as any);
			//the retry path logs progress, which we don't want cluttering test output
			sinon.stub(console, 'log');
		});

		it('resolves without sleeping when the device answers on the first attempt', async () => {
			await device.waitForDeviceOnline();

			expect(getDeviceInfoStub.callCount).to.equal(1);
			expect(listSideloadedPluginsStub.callCount).to.equal(1);
			//no grace wait, no retry wait, and no post-success settle wait
			expect(sleeps).to.eql([]);
		});

		it('passes the device config, password, and interval as the request timeout', async () => {
			await device.waitForDeviceOnline(120_000, 4000);

			expect(getDeviceInfoStub.getCall(0).args[0]).to.eql({
				device: { host: '1.1.1.1' },
				timeout: 4000
			});
			expect(listSideloadedPluginsStub.getCall(0).args[0]).to.eql({
				device: { host: '1.1.1.1' },
				password: 'password',
				timeout: 4000
			});
		});

		it('waits the grace period before the first poll', async () => {
			await device.waitForDeviceOnline(120_000, 3000, 7000);

			expect(sleeps).to.eql([7000]);
			//the grace sleep must happen before we ever ask the device anything
			expect(sleepStub.calledBefore(getDeviceInfoStub)).to.be.true;
		});

		it('skips the grace sleep when graceMs is 0', async () => {
			await device.waitForDeviceOnline(120_000, 3000, 0);

			expect(sleeps).to.eql([]);
		});

		it('retries until the device answers, then waits an extra settle period', async () => {
			getDeviceInfoStub.onCall(0).rejects(new Error('ECP down'));
			getDeviceInfoStub.onCall(1).rejects(new Error('ECP down'));

			await device.waitForDeviceOnline(120_000, 3000);

			expect(getDeviceInfoStub.callCount).to.equal(3);
			//two interval sleeps for the two failures, then the 5s settle sleep on success
			expect(sleeps).to.eql([3000, 3000, 5000]);
		});

		it('retries when ECP is up but the installer web server is not', async () => {
			listSideloadedPluginsStub.onCall(0).rejects(new Error('plugin_install down'));

			await device.waitForDeviceOnline(120_000, 3000);

			expect(listSideloadedPluginsStub.callCount).to.equal(2);
			expect(sleeps).to.eql([3000, 5000]);
		});

		it('throws with the last error message when the device never comes online', async () => {
			getDeviceInfoStub.rejects(new Error('connect ETIMEDOUT'));
			//sleep is stubbed out, so advance the clock ourselves to let the deadline actually expire
			let now = Date.now();
			sinon.stub(Date, 'now').callsFake(() => now);
			sleepStub.callsFake(((milliseconds: number) => {
				sleeps.push(milliseconds);
				now += milliseconds;
				return Promise.resolve();
			}) as any);

			const error = await getRejection(device.waitForDeviceOnline(10_000, 3000));
			expect(error.message).to.equal('Device did not come online within 10000ms. Last error: connect ETIMEDOUT');
			//10s deadline / 3s interval
			expect(getDeviceInfoStub.callCount).to.equal(4);
		});

		it('throws without polling when the timeout has already elapsed', async () => {
			const error = await getRejection(device.waitForDeviceOnline(0));
			expect(error.message).to.equal('Device did not come online within 0ms. Last error: undefined');

			expect(getDeviceInfoStub.callCount).to.equal(0);
		});
	});
});
