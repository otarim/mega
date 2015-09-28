'use strict'
var util = require('./common/util'),
	_ = require('lodash')

var store = require('./common/store')

module.exports = function(router) {
	router.get('/admin/login', login.get)
		.get('/admin/logout', logout)
		.get('/admin/reg', reg.get)

	router.post('/api/auth/login', login.post)
		.post('/api/auth/reg', reg.check, reg.post)
		.post('/api/auth/checkUser', checkUser)
}

var login = {
	get: function*() {
		yield this.render('common/login')
	},
	post: function*() {
		var body = this.request.body,
			user = util.websafe(body.user),
			psw = util.websafe(body.psw)
		var cl = this.db.collection('user'),
			result = yield cl.findOne({
				user: user
			})
		if (result) {
			var salt = result.salt
			if (util.sign(psw, salt) === result.psw) {
				yield cl.updateOne({
					user: user
				}, {
					'$set': {
						loginIp: this.request.ip,
						lastLoginTime: +new Date,
					}
				})
				this.session.user = String(result._id)
				this.cookies.set('mega.user', user, {
					maxAge: 720000,
					path: '/'
				})
				var storeUser = yield cl.findOne({
					user: user
				})
				yield store.user.set(this, storeUser._id, storeUser)
				this.body = [{
					code: 200,
					msg: '欢迎回来',
					redirect: '/admin#/'
				}]
			} else {
				this.body = [{
					code: -1,
					msg: '账户名或者密码出错'
				}]
			}
		} else {
			this.body = [{
				code: -1,
				msg: '账户名不存在'
			}]
		}
	}
}

var logout = function*() {
	this.cookies.set('mega.user', null)
	yield store.user.remove(this, this.session.user)
	this.session.user = null
	delete this.session.user
	yield this.render('common/logout')
}

var reg = {
	get: function*() {
		yield this.render('common/reg')
	},
	post: function*() {
		var body = this.request.body,
			user = util.websafe(body.user),
			psw = util.websafe(body.psw)
		var uid = yield util.getIncId(this),
			salt = util.generateSalt()
		var cl = this.db.collection('user')
		var result = yield cl.insert({
			uid: uid,
			user: user,
			// nickname: data.nickname,
			// avatar: getAvatar(data.username),
			psw: util.sign(psw, salt),
			regDate: +new Date,
			regIp: this.request.ip,
			loginIp: this.request.ip,
			lastLoginTime: +new Date,
			salt: salt
		})
		yield this.db.collection('rights').insert({
			user: String(result.ops[0]._id),
			level: 0,
			post: true,
			block: false
		})
		this.session.user = String(result._id)
		this.cookies.set('mega.user', user, {
			maxAge: 720000,
			path: '/'
		})
		yield store.user.set(this, user._id, result)
		this.body = [{
			code: 200,
			msg: '创建用户成功',
			redirect: '/admin#/'
		}]
	},
	check: function*(next) {
		var body = this.request.body,
			user = util.websafe(body.user),
			psw = util.websafe(body.psw),
			repsw = util.websafe(body.repsw)
		var cl = this.db.collection('user')
		if (user && psw && repsw) {
			var result = yield cl.findOne({
				user: user
			})
			if (result) {
				return this.body = [{
					code: -1,
					msg: '账户已存在'
				}]
			}
			if (psw !== repsw) {
				return this.body = [{
					code: -1,
					msg: '两次密码输入不一致'
				}]
			}
			yield next
		} else {
			return this.body = [{
				code: -1,
				msg: '输入字段为空'
			}]
		}
	}
}

var checkUser = function*() {
	var user = util.websafe(this.request.body.user)
	var cl = this.db.collection('user')
	var result = yield cl.findOne({
		user: user
	})
	if (result) {
		this.body = [{
			code: -1,
			msg: '账户已存在'
		}]
	} else {
		this.body = [{
			code: 200,
			msg: '账户名可用'
		}]
	}
}