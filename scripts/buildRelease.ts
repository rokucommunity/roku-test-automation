import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { argv } from 'process';

let output: any;

// Parse OTP parameter (handles both --otp=123456 and --otp 123456)
let otp: string | null = null;
const otpArg = argv.find(arg => arg.startsWith('--otp'));
if (otpArg) {
	if (otpArg.includes('=')) {
		otp = otpArg.split('=')[1];
	} else {
		const otpIndex = argv.indexOf('--otp');
		otp = otpIndex !== -1 ? argv[otpIndex + 1] : null;
	}
}

// Determine release type (exclude --otp and its value from type checking)
const releaseType = argv.find((arg, i) => {
	if (arg.startsWith('--otp')) return false;
	if (i > 0 && argv[i - 1] === '--otp') return false;
	return ['--dev', '--beta', '--alpha'].includes(arg);
});

if (releaseType !== '--dev') {
	output = execSync('npm run build', {
		encoding: 'utf8'
	});
	console.log(output);
}

const clientSourceFolder = path.resolve(__dirname + '/..');
const outputFolder = path.resolve(__dirname + '/../../release');

fsExtra.removeSync(outputFolder);

output = execSync(`npm run buildConfigSchema && npm run buildRequestArgsSchema && npm run buildRequestTypesSchema`, {
	encoding: 'utf8'
});
console.log(output);

const resourcesToCopy = [
	[path.join(clientSourceFolder, 'dist'), path.join('client', 'dist')],
	[path.join(clientSourceFolder, 'package.json'), 'package.json'],
	[path.join(clientSourceFolder, 'requestArgs.schema.json'), path.join('client', 'requestArgs.schema.json')],
	[path.join(clientSourceFolder, 'requestTypes.schema.json'), path.join('client', 'requestTypes.schema.json')],
	[path.join(clientSourceFolder, 'rta-config.schema.json'), path.join('client', 'rta-config.schema.json')],
	[path.resolve(__dirname + '/../../device'), 'device'],
	[path.resolve(__dirname + '/../../README.md'), 'README.md'],
];

for (const resourceMapping of resourcesToCopy) {
	const outputPath = path.join(outputFolder, resourceMapping[1]);
	fsExtra.copySync(resourceMapping[0], outputPath, {
		filter: (path) => {
			if(path.indexOf('.spec.') > -1) return false;
			if(path.indexOf('/test/') > -1) return false;
			return true;
		}
	});
}

if (releaseType === '--dev') {
	output = execSync(`cd ${outputFolder} && npm pack`, {
		encoding: 'utf8'
	});
} else {
	let options = '';
	if (releaseType === '--beta') {
		options = '--tag beta';
	} else if (releaseType === '--alpha') {
		options = '--tag alpha';
	}
	if (otp) {
		options += ` --otp=${otp}`;
	}

	const command = `npm publish ${options} '${outputFolder}'`;
	console.log(`Running command: ${command}`);
	output = execSync(command, {
		encoding: 'utf8'
	});
}
console.log(output);
