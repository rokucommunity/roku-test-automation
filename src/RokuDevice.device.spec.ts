import * as assert from 'assert';
import * as chai from 'chai';
import * as sinonImport from 'sinon';
import * as fsExtra from 'fs-extra';
const sinon = sinonImport.createSandbox();
const expect = chai.expect;
import * as querystring from 'querystring';
import { rokuDeploy } from 'roku-deploy';
import { ecp, device } from './';
import { setupTestEnvironment, ensureDeviceIsReady, ensureDeviceIsStillResponsive } from './test/testHelpers.spec';

describe('RokuDevice', function () {
	before(async function () {
		//waiting for the device to be online plus launching the channel takes well over the default 10s timeout
		this.timeout(240_000);
		setupTestEnvironment();
		//make sure the device is actually reachable and responsive, and back at the home screen, before
		//we launch anything. Otherwise a device that's still booting fails the whole suite in `before`.
		await ensureDeviceIsReady();
		await ecp.sendLaunchChannel();
	});

	beforeEach(async function () {
		//make sure the device is still reachable before running the next test, so a wedged device fails
		//here with a clear message rather than midway through a test
		this.timeout(120_000);
		await ensureDeviceIsStillResponsive();
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('sendEcpPost', () => {
		it('should work for POST requests', async () => {
			await device.sendEcpPost('keypress/Right');
		});

		it('should work if params are passed in', async () => {
			sinon.stub(rokuDeploy, 'sendEcpRequest').callsFake((deviceConfig, route) => {
				expect(route).to.contain(querystring.stringify(params));
				return Promise.resolve({ status: 200, body: '', headers: {} });
			});

			const params = {
				contentId: 'contentIdValue',
				mediaType: 'special'
			};
			await device.sendEcpPost('launch/dev', params);
		});

		it('should retry the specified number of times requested', async () => {
			const stub = sinon.stub(rokuDeploy, 'sendEcpRequest').callsFake(() => {
				throw new Error('Socket hang up');
			});

			const params = {
				contentId: 'contentIdValue',
				mediaType: 'special'
			};

			const retryCount = 5;
			try {
				await device.sendEcpPost('launch/dev', params, {
					retryCount: retryCount
				});
			} catch(e) {
				expect(stub.callCount).to.equal(retryCount);
				// failed as expected
				return;
			}
			assert.fail('Should have thrown an exception');
		});
	});

	describe('getScreenshot [SLOW]', () => {
		it('should output a file if a path was provided', async () => {
			const {path} = await device.getScreenshot('output');
			if (path && !fsExtra.existsSync(path)) {
				assert.fail(`'${path}' did not exist`);
			}
			fsExtra.removeSync(path as string);
		});

		it('should output a buffer if no path was provided', async () => {
			const {buffer} = await device.getScreenshot();
			expect(buffer).to.be.instanceof(Buffer);
			expect(buffer.byteLength).to.be.greaterThan(0);
		});
	});

	describe('getTelnetLog', () => {
		it('should be able to pull telnet logs', async () => {
			const contents = await device.getTelnetLog();
			expect(contents).to.not.be.empty;
		});
	});
});
