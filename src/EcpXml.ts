import * as sax from 'sax';
import type { EcpResult } from 'roku-deploy';

/**
 * Parse an ECP response body by its content-type, the way needle's transport used to:
 * json bodies to objects, xml bodies to the element tree, anything else returned raw
 */
export function parseEcpResponse(result: EcpResult): any {
	const contentTypeHeader = result.headers?.['content-type'];
	const contentType = (Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader) ?? '';
	if (contentType.includes('json')) {
		try {
			return JSON.parse(result.body);
		} catch {
			//needle fell back to the raw body when a json body did not parse
			return result.body;
		}
	}
	if (contentType.includes('xml')) {
		return parseEcpXml(result.body);
	}
	return result.body;
}

/**
 * Parse an ECP XML response body into the element tree ECP.ts walks. Lifted from needle's
 * bundled xml parser (lib/parsers.js, MIT licensed) so the tree shape RTA already depends on
 * (name/value/attributes/children) survives the move off needle as the ECP transport.
 */
export function parseEcpXml(xml: string): EcpXmlElement | undefined {
	let root: EcpXmlElement | undefined;
	let current: EcpXmlElement | undefined;
	let parseError: Error | undefined;

	// strict mode so tag/attribute casing is preserved as-is (sax only lowercases in non-strict mode)
	const parser = sax.parser(true, { trim: true });
	parser.onerror = (error) => {
		parseError = error;
	};

	parser.onopentag = (tag: sax.Tag) => {
		const element: EcpXmlElement = { name: tag.name, value: '', attributes: { ...tag.attributes }, children: [] };
		if (current) {
			element.parent = current;
			current.children.push(element);
		} else {
			root = element;
		}
		current = element;
	};

	parser.ontext = parser.oncdata = (text) => {
		if (current) {
			current.value += text;
		}
	};

	parser.onclosetag = () => {
		if (current?.parent) {
			const justClosed = current;
			current = current.parent;
			delete justClosed.parent;
		}
	};

	parser.write(xml).close();

	if (parseError) {
		throw parseError;
	}
	//empty bodies (command routes like keypress) parse to undefined, matching needle's behavior
	return root;
}

export interface EcpXmlElement {
	name: string;
	value: string;
	attributes: Record<string, string>;
	children: EcpXmlElement[];
	parent?: EcpXmlElement;
}
