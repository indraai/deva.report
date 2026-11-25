"use strict";
// Report Deva Test File
// Copyright ©2000-2026 Quinn Michaels; All rights reserved.  
// Owner Signature Required For Lawful Use.  
// Distributed under VLA:28986758608512849090 LICENSE.md
// Tuesday, November 24, 2026 - 11:57:52 AM PST

// run with: npm test
// MongoDB tests use a local server at mongodb://127.0.0.1:27017 by default. Set MONGO_URI to use another one.
// They skip with a message when MongoDB can't be reached.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MongoClient} from 'mongodb';
import Deva from '@indra.ai/deva';
import core from '@indra.ai/deva/package.json' with {type:'json'};
import pkg from './package.json' with {type:'json'};
import featureMethods from './feature/methods.js';
import REPORT from './index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const STAGES = ['start', 'enter', 'done', 'ready'];
const TIERS = ['md5', 'sha256', 'sha512'];
const PLACEHOLDER = /::[a-z-]+::|\{\{profile\.[a-z]+\}\}/;

// test database: the uri can change, the database name is fixed so the after hook only ever drops the test database.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const REPORT_DB = 'deva_report_test';

// check the server once before the tests are defined so the MongoDB tests can skip cleanly.
const mongo = new MongoClient(MONGO_URI, {serverSelectionTimeoutMS: 2000});
const MONGO_SKIP = await mongo.db('admin').command({ping: 1}).then(
	() => false,
	err => `MongoDB is not reachable at ${MONGO_URI} (${err.message}). Start a local mongod or set MONGO_URI.`
);
if (MONGO_SKIP) console.log(`⏭️ ${MONGO_SKIP}`);

// stub client built in code: the core VLA for the core check, the agent VLA for Report Deva
// and the mongo settings for the report feature. useMongo false leaves the report feature without a database.
const client = (agentVLA = pkg.VLA, useMongo = true, uri = MONGO_URI, methods = false) => ({
	id: '00000000000000000000',
	key: 'client',
	VLA: structuredClone(core.VLA),
	prompt: {
		emoji: '🧪',
		text: 'client',
		colors: {
			label: {R: 2, G: 229, B: 77},
			text: {R: 2, G: 229, B: 77},
		},
	},
	profile: {
		id: '00000000000000000000',
		name: 'Test Client',
		describe: 'Test client for Report Deva',
		lang: 'en',
		locale: 'en-US',
		currency: 'USD',
	},
	features: {
		license: {
			concerns: [],
			global: [],
			devas: {
				report: structuredClone(agentVLA),
			},
		},
		report: {
			concerns: [],
			global: useMongo ? {mongo: {uri, database: REPORT_DB}} : {},
			devas: useMongo ? {report: {mongo: {uri, database: REPORT_DB}}} : {},
			methods: methods || undefined,
		},
	},
});

let reportClient = false; // Report Deva's own MongoClient, kept so the after hook can close it.

after(async () => {
	if (!MONGO_SKIP) {
		await mongo.db(REPORT_DB).dropDatabase();
	}
	await mongo.close();
	if (reportClient) await reportClient.close();
});

test('report builds as a Deva and waits offline before init', async () => {
	assert.ok(REPORT instanceof Deva, 'the export is a Deva');
	assert.equal(await REPORT.stop(), REPORT._messages.offline, 'stop before init answers offline');
});

test('report data has no placeholders left', () => {
	assert.doesNotMatch(JSON.stringify(pkg.data), PLACEHOLDER, 'package.json data');
	assert.doesNotMatch(JSON.stringify(pkg.VLA), PLACEHOLDER, 'package.json VLA');
	assert.doesNotMatch(pkg.copyright, PLACEHOLDER, 'package.json copyright');
});

test('methods.write, func.write, onReady, onStop, and onError exist', () => {
	assert.equal(typeof REPORT.methods.write, 'function', 'methods.write');
	assert.equal(typeof REPORT.func.write, 'function', 'func.write');
	assert.equal(typeof REPORT.onReady, 'function', 'onReady');
	assert.equal(typeof REPORT.onStop, 'function', 'onStop');
	assert.equal(typeof REPORT.onError, 'function', 'onError');
});

test('report comes online and walks to ready', async () => {
	const prompts = [];
	REPORT.listen('devacore:prompt', packet => prompts.push(packet.text));
	const data = await REPORT.init(client());
	for (const k of STAGES) assert.equal(typeof data[k], 'number', `${k} timestamp`);
	assert.ok(data.start <= data.enter && data.enter <= data.done && data.done <= data.ready, 'stages in order');
	assert.equal(typeof data.id.uid, 'string', 'uid');
	for (const t of TIERS) assert.equal(typeof data[t], 'string', `${t} hash`);
	assert.ok(prompts.includes(`${REPORT.vars.messages.ready} > VLA:${pkg.VLA.uid}`), 'onReady prompts the ready message');
	assert.ok(REPORT.modules.client instanceof MongoClient, 'onReady builds the MongoClient');
	assert.equal(REPORT.vars.database, REPORT_DB, 'onReady sets the report database');
	reportClient = REPORT.modules.client;
});

test('report agent matches the package', () => {
	const agent = REPORT.agent();
	assert.equal(agent.key, 'report');
	assert.equal(agent.id, pkg.id);
	assert.equal(agent.profile.id, pkg.id);
	assert.equal(agent.profile.name, 'Report Deva');
	assert.equal(agent.profile.owner, 'Quinn Michaels');
});

test('report utils answer with trimmed text', () => {
	const {translate, parse, process} = REPORT.utils;
	for (const util of [translate, parse, process]) assert.equal(util('  hello  '), 'hello');
});

test('report help pages name the Deva and carry the package license', async () => {
	const main = await REPORT.help('main', DIR);
	assert.match(main, /^# \{\{profile\.name\}\}$/m, 'main help heading');
	const license = await REPORT.help('main:license', DIR);
	assert.match(license, new RegExp(`^uid: ${pkg.VLA.uid}$`, 'm'), 'license uid');
	for (const t of TIERS) assert.ok(license.includes(`${t}: ${pkg.VLA[t]}`), `${t} hash in the license help`);
});

// the feature loader binds client.features.report.methods onto the Deva at init.
// this uses a fresh instance so it does not change the methods on REPORT.
test('feature methods from feature/methods.js load at runtime', async () => {
	assert.deepEqual(Object.keys(featureMethods), ['report'], 'feature export names');
	assert.equal(typeof featureMethods.report, 'function', 'feature.report');
	const {default: FEATURE} = await import('./index.js?feature');
	const data = await FEATURE.init(client(pkg.VLA, false, MONGO_URI, featureMethods));
	assert.equal(typeof data.ready, 'number', 'feature instance reaches ready');
	assert.equal(typeof FEATURE.methods.report, 'function', 'the feature loader binds report');
	assert.equal(typeof FEATURE.methods.write, 'function', 'write stays on methods');
	await FEATURE.stop();
});

test('write inserts a document into the reports collection', {skip: MONGO_SKIP}, async () => {
	const payload = {id: {uid: 'write-test-1'}, content: 'hello report', created: Date.now()};
	const ans = await REPORT.methods.write(payload);
	assert.equal(ans.text, 'see data');
	assert.equal(ans.data.acknowledged, true);
	const doc = await mongo.db(REPORT_DB).collection('reports').findOne({'id.uid': 'write-test-1'});
	assert.equal(doc?.content, 'hello report');
});

// runs in a child process with a fresh Report Deva and no database, so it does not
// share the bound func object or MongoClient with the tests that use REPORT.
test('write rejects when no MongoDB client is built', async () => {
	const code = [
		`const {default: REPORT} = await import(${JSON.stringify(new URL('./index.js', import.meta.url).href)});`,
		'await REPORT.init(JSON.parse(process.env.REPORT_TEST_CLIENT));',
		"const payload = {id: {uid: 'write-missing-1'}, content: 'no mongo'};",
		'for (const [label, run] of [',
		"	['func.write', () => REPORT.func.write('reports', payload)],",
		"	['methods.write', () => REPORT.methods.write(payload)],",
		"	['/write', () => REPORT.question('/write', payload)],",
		']) {',
		'	try {',
		'		let timer;',
		'		await Promise.race([',
		'			run(),',
		'			new Promise((_, reject) => {timer = setTimeout(() => reject(new Error("TIMEOUT")), 8000);}),',
		'		]).finally(() => clearTimeout(timer));',
		'		console.log(`RESOLVED:${label}`);',
		'		process.exit(2);',
		'	} catch (err) {',
		'		if (/TIMEOUT/.test(err.message)) {',
		'			console.log(`BAD:${label}:${err.message}`);',
		'			process.exit(3);',
		'		}',
		'		console.log(`REJECTED:${label}`);',
		'	}',
		'}',
		'await REPORT.stop();',
		'console.log("RESULT:ok");',
	].join('\n');
	const env = {PATH: process.env.PATH, REPORT_TEST_CLIENT: JSON.stringify(client(pkg.VLA, false))};
	const run = promisify(execFile)(process.execPath, ['--input-type=module', '-e', code], {cwd: DIR, env, timeout: 20000, killSignal: 'SIGKILL'});
	const {stdout} = await run.catch(err => {
		if (err.stdout) assert.fail(err.stdout.trim());
		const why = err.killed ? 'did not return within 20 seconds' : `failed: ${err.message}`;
		assert.fail(`write without a MongoDB client ${why}`);
	});
	assert.match(stdout, /^RESULT:ok$/m, 'every write rejected without hanging');
});

test('a stop and init restart builds a new MongoClient and can write again', {skip: MONGO_SKIP}, async () => {
	const before = REPORT.modules.client;
	await REPORT.stop();
	const data = await REPORT.init(client());
	assert.equal(typeof data.ready, 'number', 'restart reaches ready');
	assert.ok(REPORT.modules.client instanceof MongoClient, 'restart builds a MongoClient');
	assert.notEqual(REPORT.modules.client, before, 'the MongoClient is new');
	reportClient = REPORT.modules.client;
	const payload = {id: {uid: 'write-restart-1'}, content: 'after restart', created: Date.now()};
	const ans = await REPORT.methods.write(payload);
	assert.equal(ans.data.acknowledged, true);
	const doc = await mongo.db(REPORT_DB).collection('reports').findOne({'id.uid': 'write-restart-1'});
	assert.equal(doc?.content, 'after restart');
});

test('report stops through the full chain', async () => {
	const data = await REPORT.stop();
	assert.equal(data.key, 'shutdown', 'the chain ends on shutdown');
	assert.equal(data.value, 'report');
	reportClient = false;
});

// the refusal check loads a fresh Report Deva instance from the same file, so it starts from a clean state.
test('report refuses to start with a bad agent VLA', async () => {
	const {default: REFUSE} = await import('./index.js?refuse');
	const prompts = [];
	REFUSE.listen('devacore:prompt', packet => prompts.push(packet.text));
	const result = await REFUSE.init(client({uid: 'bad'}));
	assert.equal(result, REFUSE._messages.checkVLA, 'init answers with the invalid VLA message');
	assert.ok(prompts.includes(REFUSE._messages.checkVLA), 'core prompts the invalid VLA message');
	assert.equal(REFUSE._active, false, 'the Deva stays offline');
	if (REFUSE.modules?.client) await REFUSE.modules.client.close();
});
