import assert from 'node:assert/strict';
import test from 'node:test';
import { compactAppUi, searchAppUi } from './format.ts';

test('compactAppUi stops at maxDepth and keeps identifying fields', () => {
	const result = compactAppUi({
		plugin: { id: 'dev', name: 'Test' },
		screen: {
			focused: true,
			type: 'screen',
			children: [{
				base: 'scene',
				subtype: 'Scene',
				keyPath: '',
				id: 'main',
				visible: true,
				children: [{
					base: 'scene',
					subtype: 'Label',
					keyPath: '0',
					text: 'Hello',
					focused: true,
					visible: false,
					children: [{ base: 'scene', subtype: 'Poster', keyPath: '0.0' }]
				}]
			}]
		}
	}, 1);

	const scene = result.screen.children[0];
	const label = scene?.children?.[0];
	assert.equal(scene?.id, 'main');
	assert.equal(scene?.visible, undefined);
	assert.equal(label?.text, 'Hello');
	assert.equal(label?.focused, true);
	assert.equal(label?.visible, false);
	assert.equal(label?.childCount, 1);
	assert.equal(label?.children, undefined);
});

test('searchAppUi returns matching nodes, ancestors, and key paths without child trees', () => {
	const result = searchAppUi({
		plugin: { id: 'dev', name: 'Test' },
		screen: {
			focused: true,
			type: 'screen',
			children: [{
				base: 'scene',
				subtype: 'Scene',
				keyPath: '',
				id: 'main',
				children: [{
					base: 'scene',
					subtype: 'Group',
					keyPath: '#content',
					id: 'content',
					children: [{
						base: 'scene',
						subtype: 'Label',
						keyPath: '#content.#title',
						id: 'title',
						text: 'Gone in 60 Seconds',
						children: [{ base: 'scene', subtype: 'Poster', keyPath: '#content.#title.0' }]
					}]
				}]
			}]
		}
	}, {
		query: 'gone IN 60',
		fields: ['text']
	});

	assert.equal(result.matchCount, 1);
	assert.equal(result.truncated, false);
	assert.equal(result.matches[0]?.keyPath, '#content.#title');
	assert.deepEqual(result.matches[0]?.matchedFields, ['text']);
	assert.deepEqual(
		result.matches[0]?.ancestors.map((ancestor) => ancestor.id),
		['main', 'content']
	);
	assert.equal('children' in (result.matches[0]?.node ?? {}), false);
});

test('searchAppUi reports the full count when results are limited', () => {
	const result = searchAppUi({
		plugin: { id: 'dev', name: 'Test' },
		screen: {
			focused: true,
			type: 'screen',
			children: [
				{ base: 'scene', subtype: 'Label', keyPath: '0', text: 'Match' },
				{ base: 'scene', subtype: 'Label', keyPath: '1', text: 'Match' }
			]
		}
	}, {
		query: 'Match',
		fields: ['text'],
		exact: true,
		caseSensitive: true,
		limit: 1
	});

	assert.equal(result.matchCount, 2);
	assert.equal(result.matches.length, 1);
	assert.equal(result.truncated, true);
});
