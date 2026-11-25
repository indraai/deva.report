# Report Deva

Report Deva is the chain-of-custody reporting agent for Indra.ai and Deva.world. Its agent key is `report`. It writes report packets into a MongoDB `reports` collection. Commands talk to it directly with `/write` or, from another Deva, with `#report write`.

## Requirements

- Node.js with npm. Report Deva's `package.json` sets no `engines`. Deva Core 1.67.26 declares `"node": ">=22"` and `"npm": ">=9.5.1"` in its own `package.json`.
- A project with `"type": "module"` in its `package.json`. Report Deva is an ES module.
- `@indra.ai/deva` `^1.67.26` (Deva Core) and `mongodb` `^6.1.0`. Both install with Report Deva.
- A MongoDB server if you want reports saved. A local `mongod` at `mongodb://127.0.0.1:27017` is enough.

## Install

```bash
npm install @indra.ai/deva.report --save
```

```js
import ReportDeva from '@indra.ai/deva.report';
```

## Two licenses

A running Deva carries two separate licenses, and each is checked on its own.

- **The core license** comes through the client data as `client.VLA`. Deva Core checks it against the core package's VLA at the start of `init`.
- **The agent license** comes through the license feature data as `features.license.devas.report`. Deva Core 1.67.26 checks it against the VLA in Report Deva's own `package.json` right after the features load and before `onInit`. Report Deva has no `onInit` of its own, so it has no license check of its own to change or remove.

The agent check compares the sha256 of the whole VLA object, so every field has to match exactly.

## Configuration

Report Deva reads two features from the client you pass to `init()`. The feature data loader puts them in the client, and Deva Core loads them into the Deva at startup, so both must be there before `init()` runs.

```json
"features": {
	"license": {
		"concerns": [],
		"global": [],
		"devas": {
			"report": {"uid": "28986758608512849090"}
		}
	},
	"report": {
		"concerns": [],
		"global": {
			"mongo": {
				"uri": "mongodb://127.0.0.1:27017",
				"database": "ReportDeva"
			}
		},
		"devas": {
			"report": {
				"mongo": {
					"uri": "mongodb://127.0.0.1:27017",
					"database": "ReportDeva"
				}
			}
		}
	}
}
```

- `license.devas.report` is the agent VLA. The short form above only shows where it goes. It must be the full `VLA` object from this package's `package.json`, for example:

```js
import pkg from '@indra.ai/deva.report/package.json' with {type:'json'};

const devas = {report: pkg.VLA}; // goes in features.license.devas
```

- `report.global.mongo.uri` is the MongoDB connection string. If it is not set, Report Deva still comes online but builds no MongoDB client, and `write` rejects.
- `report.global.mongo.database` is the database name. `onReady` stores it in `this.vars.database`. `write` inserts into the `reports` collection in that database.
- The tests also set `report.devas.report` with the same `{uri, database}` shape. That is the personal record for this agent (`agent.key` is `report`). Deva Core exposes it as `this.report().personal`. `onReady` and `write` read only `this.report().global?.mongo`. They do not use the personal record.

## Load it

```js
import ReportDeva from '@indra.ai/deva.report';

const report = await ReportDeva.init(client); // client data provided by your loader
console.log(report.id.uid);
```

When the license checks pass, Report Deva walks start, enter, done and ready. In `onReady` it reads `this.report().global?.mongo`, builds a `MongoClient` in `this.modules.client` when `uri` is set, keeps `database` in `this.vars.database`, and prompts `📊 Report Deva Ready > VLA:28986758608512849090`.

To shut it down:

```js
await ReportDeva.stop();
```

`onStop` closes the MongoDB client, if there is one, then calls `this.close(data, resolve)`. If there is no client, it calls `this.close(data, resolve)` directly. A stopped Deva can start again. Call `init()` again with a client that passes the license check. Report Deva builds a new MongoDB client in `onReady`.

## When Report Deva refuses to start

If the agent license check fails, Deva Core prompts the message, stops the Deva, and `init()` resolves with that message.

| You see | Why |
| --- | --- |
| `❌ Bad Personal VLA` | `features.license.devas` is there but has no `report` entry. |
| `❌ Invalid VLA Check` | The `report` entry doesn't match this package's VLA, or the license feature has no `devas`. |

## Commands

Talk to Report Deva with `/write` when it is the current agent, or with `#report write` from another Deva.

| Command | What it does |
| --- | --- |
| `/write` | Inserts the command packet into the `reports` collection of `this.vars.database`. It returns `{text: 'see data', html: '<p>see data</p>', data}`, where `data` is the MongoDB `insertOne` result (`acknowledged` and `insertedId`). |

`methods.write(packet)` is the method behind that command. It always calls `func.write('reports', packet)` and returns that same `{text, html, data}` object. The packet is stored as it was passed in. If there is no MongoDB client, or the insert fails, `methods.write` catches the error and returns `this.err(err, packet)`, which goes through `onError`. The write rejects. It does not hang, and it does not resolve with empty data.

## Functions

| Func | What it does |
| --- | --- |
| `write` | Inserts `packet` into collection `type` in `this.vars.database`, using the one `MongoClient` in `this.modules.client`. It returns the `insertOne` result. `methods.write` always calls it with `type` set to `reports`. There is no try/catch in `func.write`; a missing client or a failed insert throws, and `methods.write` handles it. |

## Feature methods

`feature/methods.js` exports a `report(packet)` method. The feature loader binds it at runtime from `client.features.report.methods` onto the Deva's `methods`. In 0.24.4 the method returns `{}`.

## Help

Help lives in two Feecting files. `help/main.feecting` is the main help page, with the heading `{{profile.name}}`, and it also holds the license block. `help/corpus.feecting` is the help corpus. The tests check that the main heading is there and that the license page carries this package's VLA uid and hash tiers.

## Inside Report Deva

| Name | Kind | What it does |
| --- | --- | --- |
| `write` | func | Inserts a packet into a named collection, as described above. It lives in `index.js`. |
| `write` | method | The `/write` command, also in `index.js`. |
| `translate`, `parse`, `process` | utils | Each returns its input trimmed. |
| `onReady` | lifecycle | Builds the MongoDB client from the report feature's `global.mongo` and prompts the ready message. |
| `onStop` | lifecycle | Closes the MongoDB client, if there is one, then calls `this.close(data, resolve)`. |
| `onError` | lifecycle | Prompts `💣 ERROR!`, logs the error, and returns `reject(err)` or `Promise.reject(err)`. |
| `modules.client` | module | The `MongoClient`, set in `onReady` when a `uri` is given. |

The `vars` in `package.json` hold the prompt `messages`. `this.vars.database` is set in `onReady` from `global.mongo.database`.

## Testing

Start a local MongoDB, then run:

```bash
node --test
```

The package.json `test` script is `node --test`, so `npm test` runs the same file. The tests use `mongodb://127.0.0.1:27017` by default. To use another server, set `MONGO_URI`:

```bash
MONGO_URI="mongodb://127.0.0.1:27018" node --test
```

The tests always write to their own database, `deva_report_test`, and drop it when they finish. Only the server can change, so the cleanup never touches another database. If MongoDB can't be reached, the MongoDB tests are skipped with a message and the rest still run, including the check that `write` rejects when no MongoDB client is built.

The tests build a stub client in code from the core VLA in `@indra.ai/deva/package.json` and the VLA in this package's `package.json`, so no client file is needed. They cover:

- report builds as a Deva and waits offline before init
- report data has no placeholders left
- `methods.write`, `func.write`, `onReady`, `onStop`, and `onError` exist
- report comes online and walks to ready
- report agent matches the package
- report utils answer with trimmed text
- report help pages name the Deva and carry the package license
- feature methods from `feature/methods.js` load at runtime
- `write` inserts a document into the `reports` collection (MongoDB)
- `write` rejects when no MongoDB client is built
- a stop and `init` restart builds a new MongoClient and can write again (MongoDB)
- report stops through the full chain
- report refuses to start with a bad agent VLA

## Files

| File | What it holds |
| --- | --- |
| `index.js` | The Report Deva: utils, `func.write`, `methods.write`, and the lifecycle hooks. |
| `package.json` | Package info, the package VLA, and the agent and vars data under `data`. |
| `feature/methods.js` | The `report(packet)` feature method that the feature loader binds at runtime. |
| `help/main.feecting` | The main help page and the license block. |
| `help/corpus.feecting` | The help corpus. |
| `index.test.js` | The tests. |
| `assets/` | The emoji, avatar, background and main images. |
| `LICENSE.md` | The license. |

Copyright ©2000-2026 Quinn Michaels; All rights reserved.  
Owner Signature Required For Lawful Use.  
Distributed under VLA:28986758608512849090 LICENSE.md  
Tuesday, November 24, 2026 - 11:57:52 AM PST
