'use strict'
var util = require('./common/util'),
	checkRights = require('./common/checkRights'),
	_ = require('lodash'),
	ObjectID = require('mongodb').ObjectID

var store = require('./common/store')

module.exports = function(router) {
	router
		.post('/api/users/rights', setRights)
		.get('/api/users/', getUserList)
}

var getUserList = function*() {
	var isAdmin = yield this.db.collection('rights').findOne({
		user: this.session.user
	})
	if (isAdmin && isAdmin.level > 0) {
		var result = yield this.db.collection('user').find({}, {
			psw: 0,
			salt: 0
		}).sort({
			uid: 1
		}).toArray()
		result = _.groupBy(result, function(user) {
			return user._id
		})
		var rights = yield this.db.collection('rights').find({}).toArray()
		rights.forEach(function(right) {
			_.assign(right, result[right.user][0])
		})
		this.body = rights
	} else {
		this.throw(401, '你没有获取列表权限')
	}
}

var setRights = function*() {
	var body = this.request.body,
		isAdmin = yield this.db.collection('rights').findOne({
			user: this.session.user
		})
	if (isAdmin && isAdmin.level > 0) {
		yield this.db.collection('rights').updateOne({
			user: body.id
		}, {
			$set: body
		})
		this.body = [{
			code: 200,
			msg: '权限更新成功'
		}]
	} else {
		this.throw(401, '你没有修改权限的权限')
	}
}