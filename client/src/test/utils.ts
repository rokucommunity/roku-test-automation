import * as fsExtra from 'fs-extra';
import type * as needle from 'needle';

import { utils } from '../utils';
import { RokuDevice } from '../RokuDevice';

/**
 * A RokuDevice subclass for use in unit tests. Lets `instanceof RokuDevice`
 * checks pass without making real network calls. Override or stub `sendEcpPost`
 * / `sendEcpGet` from individual tests as needed.
 */
export class FakeRokuDevice extends RokuDevice {
	public sendEcpPost = (() => Promise.resolve(undefined)) as any;
	public sendEcpGet = (() => Promise.resolve(undefined)) as any;
}

export async function getMock(mockFilePath: string) {
	return await fsExtra.readFile(mockFilePath, 'utf8');
}

export async function getTestMock(contextOrSuiteOrString: Mocha.Context | Mocha.Suite | string, extension: MockFileFormat = 'json'): Promise<object | string> {
	let relativePath: string;

	if (typeof contextOrSuiteOrString === 'string') {
		relativePath = `${contextOrSuiteOrString}.${extension}`;
	} else {
		relativePath = utils.generateFileNameForTest(contextOrSuiteOrString, extension, '', '/');
	}

	const mockFilePath = 'src/test/mocks/' + relativePath;

	const mockContents = await getMock(mockFilePath);
	if (extension === 'json') {
		return JSON.parse(mockContents);
	} else {
		return mockContents;
	}
}

export async function getNeedleMockResponse(contextOrSuiteOrString: Mocha.Context | Mocha.Suite | string, extension: MockFileFormat = 'json'): Promise<needle.NeedleResponse> {
	const mock: any = {
		body: await getTestMock(contextOrSuiteOrString, extension)
	};
	return mock;
}

declare type MockFileFormat = 'json' | 'xml';
