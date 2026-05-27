const nodeVersion = +process.versions.node.split('.')[0];
const config = {
    timeout: 10000,
    bail: false,
    fullTrace: true,
    watchExtensions: ['ts'],
    require: [
        'ts-node/register',
        'source-map-support/register',
        './src/test/setup.ts'
    ]
};
if (nodeVersion >= 22) {
    config['node-option'] = ['no-experimental-strip-types'];
}
module.exports = config;
