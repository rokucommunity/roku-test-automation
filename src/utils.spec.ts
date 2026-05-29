import * as assert from 'assert';
import * as chai from 'chai';
const expect = chai.expect;
import * as sinonImport from 'sinon';
const sinon = sinonImport.createSandbox();
import * as fsExtra from 'fs-extra';
import * as path from 'path';


import {utils} from './utils';

const tempDir = path.resolve(__dirname, '../.tmp');

describe('utils', function () {
	beforeEach(() => {
		fsExtra.emptyDirSync(tempDir);
	});

	afterEach(() => {
		sinon.restore();
		fsExtra.removeSync(tempDir);
	});

	describe('getConfigFromConfigFile', function () {
		it('allows us to extend the config and have the correct values from both config files', () => {
			const baseConfig = {
				RokuDevice: {
					devices: [{ host: '1.2.3.4', password: 'pw' }]
				},
				OnDeviceComponent: {
					helperInjection: {
						componentPaths: ['components/MainScene.xml']
					}
				}
			};
			const baseConfigPath = path.join(tempDir, 'base-rta-config.json');
			const childConfigPath = path.join(tempDir, 'rta-config.json');
			const childConfig = {
				extends: baseConfigPath,
				RokuDevice: {
					deviceIndex: 0
				}
			};
			fsExtra.writeJsonSync(baseConfigPath, baseConfig);
			fsExtra.writeJsonSync(childConfigPath, childConfig);

			const config = utils.getConfigFromConfigFile(childConfigPath);

			expect(config.RokuDevice.devices.length).to.be.greaterThan(0);
			expect(config.RokuDevice.deviceIndex).to.equal(0);
			expect(config.OnDeviceComponent?.helperInjection?.componentPaths).to.include('components/MainScene.xml');
		});

		it('throws an exception if the file does not exist', () => {
			try {
				utils.getConfigFromConfigFile('invalid.json');
			} catch(e) {
				// failed as expected
				return;
			}
			assert.fail('Should have thrown an exception');
		});

		it('throws an exception if a circular reference is detected', () => {
			try {
				sinon.stub(utils, 'parseJsonFile').callsFake((filePath) => {
					return {
						extends: filePath
					};
				});
				const fakeFileName = utils.randomStringGenerator();
				utils.getConfigFromConfigFile(fakeFileName);
			} catch(e) {
				// failed as expected
				return;
			}
			assert.fail('Should have thrown an exception');
		});
	});

	describe('getTestTitlePath', function () {
		it('Does not mess with test name if sanitize is off', function () {
			const result = utils.getTestTitlePath(this, false);
			expect(result[2]).to.equal(this.test?.title);
		});

		it('Properly sanitizes if turned on ;,.:*^', function () {
			const result = utils.getTestTitlePath(this, true);
			expect(result[2]).to.equal('Properly_sanitizes_if_turned_on_______');
		});
	});
});
