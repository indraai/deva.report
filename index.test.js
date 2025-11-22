"use strict";
// Copyright ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:43799290956467599250 LICENSE.md
// Saturday, November 22, 2025 - 3:03:50 PM

// Report Deva test file

import {expect} from 'chai';
import ReportDeva from './index.js';

describe(ReportDeva.me.name, () => {
  beforeEach(() => {
    return ReportDeva.init()
  });
  it('Check the DEVA Object', () => {
    expect(ReportDeva).to.be.an('object');
    expect(ReportDeva).to.have.property('agent');
    expect(ReportDeva).to.have.property('vars');
    expect(ReportDeva).to.have.property('listeners');
    expect(ReportDeva).to.have.property('methods');
    expect(ReportDeva).to.have.property('modules');
  });
})
