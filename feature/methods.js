export default {
	async report(packet) {
		const report = await this.methods.sign('report', 'default', packet);
		return report;
	}
};
