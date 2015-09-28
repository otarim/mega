'use strict'
var store = require('./store')

module.exports = function*(next) {
	if (!this.session.user) {
		return this.redirect('/admin/login')
	}
	var rights = yield this.db.collection('rights').findOne({
		user: this.session.user
	})
	if (rights.block) {
		this.body = '你已经被加入黑名单'
	}
	yield next
}