"use strict";
// Report Deva Test File
// Copyright ©2000-2026 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:57130292325316813101 LICENSE.md
//  Monday, January 5, 2026 - 6:16:07 PM


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
