'use strict'

var checkRights = require('./common/checkRights'),
	store = require('./common/store')

module.exports = function(router) {
	router.get('/admin', checkRights, function*() {
		var user = yield store.user.get(this, this.session.user)
		this.body = yield this.render('admin/admin', user)
	})
}