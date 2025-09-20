"use strict";
// Copyright ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:43799290956467599250 LICENSE.md

export default {
	async report(packet) {
		const report = await this.methods.sign('report', 'default', packet);
		return report;
	}
};
