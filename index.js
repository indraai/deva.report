"use strict";
// Copyright ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:43799290956467599250 LICENSE.md

// Report Deva

import Deva from '@indra.ai/deva';
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


const REPORT = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {return input.trim();},
    parse(input) {return input.trim();},
    process(input) {return input.trim();}
  },
  listeners: {
    'devacore:question'(packet) {
      this.methods.echo(agent.key, 'q', packet);
    },
    'devacore:answer'(packet) {
      this.methods.echo(agent.key, 'a', packet);
    },
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
  onInit(data, resolve) {
    const {personal} = this.license(); // get the license config
    const agent_license = this.info().VLA; // get agent license
    const license_check = this.license_check(personal, agent_license); // check license
    // return this.start if license_check passes otherwise stop.
    return license_check ? this.start(data, resolve) : this.stop(data, resolve);
  }, 
  onReady(data, resolve) {
    const {VLA} = this.info();
    const {uri,database} = this.report().global.mongo;
    this.modules.client = new MongoClient(uri);
    this.vars.database = database;
    this.prompt(`${this.vars.messages.ready} > VLA:${VLA.uid}`);
    return resolve(data);
  },
  onError(err, data, reject) {
    this.prompt(this.vars.messages.error);
    console.log(err);
    return reject(err);
  }
});
export default REPORT
