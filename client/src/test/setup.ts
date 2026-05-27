// Hard-fail on unhandled promise rejections. Mocha will surface the error and
// non-zero the run, which is what we want in CI rather than silent passes.
process.on('unhandledRejection', (reason) => {
	console.error(reason);
	process.exit(1);
});
