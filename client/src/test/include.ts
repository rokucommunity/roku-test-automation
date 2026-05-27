import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { utils } from '../utils';
import { proxy, odc } from '../';
// const wtf = require('wtfnode');

process.on('unhandledRejection', (reason) => {
	console.error(reason);
	process.exit(1);
});

// Only load device config + register device-cleanup hooks when an rta-config.json
// is present. Allows the non-device test suites (ECP, utils) to run in CI without
// a config file.
if (fsExtra.existsSync(path.resolve('rta-config.json'))) {
	utils.setupEnvironmentFromConfigFile();

	after(async function () {
		await proxy.stop();
		await odc.shutdown();
		// console.log(wtf.dump());
	});
}
