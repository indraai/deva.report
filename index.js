"use strict";
// Report Deva
// Copyright ©2000-2026 Quinn Michaels; All rights reserved.  
// Owner Signature Required For Lawful Use.  
// Distributed under VLA:28986758608512849090 LICENSE.md
// Tuesday, November 24, 2026 - 11:57:52 AM PST

import Deva from '@indra.ai/deva';
// import research from '/Users/quinnmichaels/Dev/deva.space/devas/deva.research/index.js'

import {MongoClient} from 'mongodb';
import pkg from './package.json' with {type:'json'};
const {agent,vars} = pkg.data;

import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';    
const __dirname = dirname(fileURLToPath(import.meta.url));

const info = {
  id: pkg.id,
  name: pkg.name,
  version: pkg.version,
  author: pkg.author,
  describe: pkg.description,
  dir: __dirname,
  url: pkg.homepage,
  git: pkg.repository.url,
  bugs: pkg.bugs.url,
  license: pkg.license,
  VLA: pkg.VLA,
  copyright: pkg.copyright,
};

const ReportDeva = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {return input.trim();},
    parse(input) {return input.trim();},
    process(input) {return input.trim();}
  },
  listeners: {},
  devas: {
    // research,
  },
  modules: {
    client: false,
  },
  func: {
    /**************
    func: report_write
    params: type, packet
    describe: this is the log file writer function that handles writing
    the interactions to json log file.
    ***************/
    async write(type, packet) {
      let result = false;
      try {
        const database = this.modules.client.db(this.vars.database);
        const collection = database.collection(type);
        result = await collection.insertOne(packet);
      } catch (e) {
        return this.error(e, packet, false);
      } finally {
        return result;
      }
    },

  },
  methods: {
    write(packet) {
      return new Promise((resolve, reject) => {
        try {
          this.func.write('reports', packet).then(report => {
            return resolve({
              text: 'see data',
              html: '<p>see data</p>',
              data: report,
            });            
          });
        } catch (err) {
          return this.error(err, packet, reject);
        }
      });
    }
  },
  onReady(data, resolve) {
    const {VLA} = this.info();
    const {uri,database} = this.report().global?.mongo || {};
    if (uri) this.modules.client = new MongoClient(uri); // build the client if uri is set
    this.vars.database = database;
    this.prompt(`${this.vars.messages.ready} > VLA:${VLA.uid}`);
    return resolve(data);
  },
  onStop(data, resolve) {
    const {client} = this.modules;
    if (!client) return this.close(data, resolve);
    return client.close().then(() => this.close(data, resolve)); // close the database before shutdown
  },
  onError(err, data, reject) {
    this.prompt(this.vars.messages.error);
    console.log(err);
    return reject ? reject(err) : Promise.reject(err);
  }
});
export default ReportDeva
