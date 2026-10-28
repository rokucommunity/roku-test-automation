import type { AppUIResponse, AppUIResponseChild } from '../../src/types/AppUIResponse.ts';

type ShownField = 'subtype' | 'id' | 'name' | 'text' | 'keyPath' | 'uiElementId' | 'uri' | 'sceneRect' | 'totalChildren';

export interface CompactNode extends Pick<AppUIResponseChild, ShownField> {
	focused?: true;
	focusable?: true;
	visible?: false;
	childCount?: number;
	children?: CompactNode[];
}

export interface SearchAppUiOptions {
	query: string;
	fields?: string[];
	exact?: boolean;
	caseSensitive?: boolean;
	limit?: number;
}

type AppUiNodeWithoutChildren = Omit<AppUIResponseChild, 'children'>;

export interface AppUiAncestor {
	subtype: string;
	id?: string;
	name?: string;
	text?: string;
	keyPath: string;
	uiElementId?: string;
}

export interface AppUiSearchMatch {
	base: AppUIResponseChild['base'];
	keyPath: string;
	matchedFields: string[];
	ancestors: AppUiAncestor[];
	node: AppUiNodeWithoutChildren;
}

function omitUndefined<T extends object>(value: T): T {
	const result: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry !== undefined) {
			result[key] = entry;
		}
	}
	return result as T;
}

export function compactNode(node: AppUIResponseChild, depth: number, maxDepth: number): CompactNode {
	const children = node.children ?? [];
	const compact: CompactNode = {
		subtype: node.subtype,
		id: node.id,
		name: node.name,
		text: node.text,
		keyPath: node.keyPath,
		uiElementId: node.uiElementId,
		focused: node.focused ? true : undefined,
		focusable: node.focusable ? true : undefined,
		visible: node.visible === false ? false : undefined,
		uri: node.uri,
		sceneRect: node.sceneRect,
		totalChildren: node.totalChildren
	};

	if (children.length > 0 && depth < maxDepth) {
		compact.children = children.map((child) => compactNode(child, depth + 1, maxDepth));
	} else if (children.length > 0) {
		compact.childCount = children.length;
	}

	return omitUndefined(compact);
}

export function compactAppUi(response: AppUIResponse, maxDepth: number) {
	return {
		plugin: response.plugin,
		screen: {
			focused: response.screen.focused,
			type: response.screen.type,
			children: response.screen.children.map((child) => compactNode(child, 0, maxDepth))
		}
	};
}

export function searchAppUi(response: AppUIResponse, options: SearchAppUiOptions) {
	const matches: AppUiSearchMatch[] = [];
	const limit = options.limit ?? 50;
	let matchCount = 0;

	const visit = (node: AppUIResponseChild, ancestors: AppUiAncestor[]) => {
		const { children, ...nodeWithoutChildren } = node;
		const searchableNode = nodeWithoutChildren as Record<string, unknown>;
		const fields = options.fields ?? Object.keys(nodeWithoutChildren);
		const matchedFields = fields.filter((field) => {
			if (!(field in searchableNode)) {
				return false;
			}
			return valueMatches(searchableNode[field], options);
		});

		if (matchedFields.length > 0) {
			matchCount++;
			if (matches.length < limit) {
				matches.push({
					base: node.base,
					keyPath: node.keyPath,
					matchedFields,
					ancestors,
					node: nodeWithoutChildren
				});
			}
		}

		const hierarchy = [...ancestors, ancestorFromNode(node)];
		for (const child of children ?? []) {
			visit(child, hierarchy);
		}
	};

	for (const root of response.screen.children) {
		visit(root, []);
	}

	return {
		plugin: response.plugin,
		query: options.query,
		matchCount,
		truncated: matchCount > matches.length,
		matches
	};
}

function ancestorFromNode(node: AppUIResponseChild): AppUiAncestor {
	return omitUndefined({
		subtype: node.subtype,
		id: node.id,
		name: node.name,
		text: node.text,
		keyPath: node.keyPath,
		uiElementId: node.uiElementId
	});
}

function valueMatches(value: unknown, options: SearchAppUiOptions) {
	if (value === undefined || value === null) {
		return false;
	}

	const candidate = typeof value === 'string' ? value : JSON.stringify(value);
	const query = options.caseSensitive ? options.query : options.query.toLocaleLowerCase();
	const normalizedCandidate = options.caseSensitive ? candidate : candidate.toLocaleLowerCase();
	return options.exact ? normalizedCandidate === query : normalizedCandidate.includes(query);
}
