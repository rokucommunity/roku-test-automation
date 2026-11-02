import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.ts';
import { shutdownRta } from './session.ts';

// RTA writes progress to console.log. Stdout is the MCP protocol stream.
console.log = (...args: unknown[]) => {
	console.error(...args);
};

function close() {
	const force = setTimeout(() => process.exit(0), 1000);
	void shutdownRta().finally(() => {
		clearTimeout(force);
		process.exit(0);
	});
}

process.on('SIGINT', close);
process.on('SIGTERM', close);

void serveStdio(createServer);
console.error('Roku Test Automation MCP server running');
