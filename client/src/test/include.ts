import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { utils } from '../utils';
import { proxy, odc } from '../';

// Only load the config if it exists. Non-device specs (ECP, utils) don't need it
// and we want those to be runnable in CI where no rta-config.json is present.
if (fsExtra.existsSync(path.resolve('rta-config.json'))) {
	utils.setupEnvironmentFromConfigFile();
}
// const wtf = require('wtfnode');

process.on('unhandledRejection', (reason) => {
	console.error(reason);
	process.exit(1);
});

after(async function () {
	await proxy.stop();
	await odc.shutdown();
	// console.log(wtf.dump());
});
