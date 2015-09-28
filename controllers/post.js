'use strict'
var util = require('./common/util'),
	checkRights = require('./common/checkRights'),
	_ = require('lodash'),
	trimHtml = require('trim-html'),
	ObjectID = require('mongodb').ObjectID,
	schedule = require('node-schedule'),
	shortid = require('shortid'),
	co = require('co')

var store = require('./common/store'),
	event = require('./common/event')

module.exports = function(router) {
	router.post('/api/post', post)
		.put('/api/post/', editPost)
		.get('/api/post/', getPost)
		.delete('/api/post/', deletePost)
		.get('/api/posts/', getMyPost)
		.get('/api/posts/all', getPosts)
		.get('/api/post/count', incrCount)
		.get('/api/post/rank', getRank)
		.head('/api/post/checkNewPost', preCheckNewPost)
		.get('/api/post/checkNewPost', checkNewPost)
}

var post = function*() {
	var user = yield store.user.get(this, this.session.user),
		rights = yield this.db.collection('rights').findOne({
			user: this.session.user
		})
	if (rights.post) {
		var body = this.request.body
		if (body.title && body.content) {
			// 返回对象 .ops[0] 为写入的 document
			let post = {
				user: user._id,
				title: util.websafe(body.title),
				tags: util.websafe(body.tags),
				content: body.content,
				desc: trimHtml(body.content, {
					limit: 140
				}),
				publish: body.publish,
				postDate: +new Date,
				views: 0
			}
			let insert = yield this.db.collection('post').insert(post)
			post = insert.ops[0]
			if (body.publish) {
				yield store.rank.add(this, post._id, 0)
			}
			yield store.post.set(this, post._id, post)

			post.cron = body.cron

			if (!body.cron && body.publish) {
				yield store.pubQueue.push(this, post._id)
			}

			if (body.cron && !body.publish) {
				// 定时任务
				// new Date('2012/12/21 9:20:20')
				event.emit('schedule:post', this, post._id, post)
			}

			event.emit('es:addPost', post._id, post)

			this.body = [{
				code: 200,
				msg: body.publish ? '发布成功' : '保存成功'
			}]
		}
	} else {
		this.throw(401, '你没有发布权限')
	}
}

var editPost = function*() {
	var user = yield store.user.get(this, this.session.user),
		rights = yield this.db.collection('rights').findOne({
			user: this.session.user
		}),
		fields
	if (rights.post) {
		var body = this.request.body
		if (body.id) {
			var post = yield store.post.get(this, body.id)
			if (post.user !== this.session.user) {
				this.throw(401, '你没有修改权限')
			}
			fields = _.assign({}, body, {
				lastUpdate: +new Date,
			})
			if (body.title) {
				fields.title = util.websafe(body.title)
			}
			if (body.tags) {
				fields.tags = util.websafe(body.tags)
			}
			if (body.content) {
				fields.desc = trimHtml(body.content, {
					limit: 140
				})
			}
			var post = yield this.db.collection('post').updateOne({
				_id: ObjectID(body.id)
			}, {
				'$set': fields
			})
			post = yield this.db.collection('post').findOne({
				_id: ObjectID(body.id)
			})
			yield store.post.set(this, body.id, post)

			if (body.publish) {
				yield store.pubQueue.push(this, body.id)
				yield store.rank.add(this, body.id)
			} else {
				if (body.cron) {
					event.emit('schedule:post', this, body.id, post)
				} else {
					yield store.pubQueue.remove(this, body.id);
					yield store.rank.remove(this, body.id)
				}
			}

			// body.cron 修改延迟发布，计时器的处理 todo
			// 缓存处理全部改成异步事件，方便管理

			event.emit('es:updatePost', body.id, post)

			this.body = [{
				code: 200,
				msg: '更新成功'
			}]
		} else {
			this.throw('参数错误', 204)
		}
	} else {
		this.throw(401, '你没有更新权限')
	}
}

var getPost = function*() {
	var query = this.request.query,
		postId = query.id,
		similarPost
	var result = yield store.post.get(this, postId)

	if (result) {
		// 相似文章
		if (result.tags && result.tags.length) {
			similarPost = yield this.db.collection('post').find({
				_id: {
					$ne: typeof result._id === 'string' ? ObjectID(result._id) : result._id
				},
				tags: {
					$in: result.tags
				},
				publish: true
			}, {
				title: 1,
				postDate: 1
			}).limit(5).toArray()
		}
		result = yield util.convertPost(this, result)
	}

	// post restangular 属性
	this.body = {
		result: (result || [])[0],
		similar: similarPost
	}
}

var deletePost = function*() {
	var query = this.request.query,
		postId = query.id
	yield this.db.collection('post').remove({
		_id: ObjectID(postId)
	})
	yield store.post.remove(this, postId)
	yield store.pubQueue.remove(this, postId)
	event.emit('es:deletePost', postId)
	this.body = [{
		code: 200,
		msg: '删除文章成功'
	}]
}

var getMyPost = function*() {
	var query = this.request.query,
		id = this.session.user,
		num = Number(query.num) || 10,
		pageNo = Number(query.pageNo) || 1
	var count = yield this.db.collection('post').find({
		user: id
	}).count()

	// toArray required...
	var result = yield this.db.collection('post').find({
		user: id
	}).sort({
		postDate: -1
	}).skip((pageNo - 1) * num).limit(num).sort({
		postDate: -1
	}).toArray()

	this.body = {
		total: count,
		result: yield util.convertPost(this, result)
	}
}

var getPosts = function*() {
	// 获取所有发布状态为true的文章
	var query = this.request.query,
		num = Number(query.num) || 10,
		pageNo = Number(query.pageNo) || 1
	var count = yield this.db.collection('post').find({
		publish: true
	}).count()

	var result = yield this.db.collection('post').find({
		publish: true
	}, {
		content: 0,
	}).skip((pageNo - 1) * num).limit(num).sort({
		postDate: -1
	}).toArray()

	this.body = {
		total: count,
		result: yield util.convertPost(this, result)
	}
}

var incrCount = function*() {
	var query = this.request.query
	if (query.id) {
		yield store.post.incrCount(this, query.id)
		this.body = 'ok'
	}
}

var getRank = function*() {
	var ret = yield this.redis.zrevrangebyscore('mega:rank', '+inf', '-inf')
	ret = ret.slice(0, 5)
	ret = yield store.post.hmget(this, ret)
	ret = ret.map(function(post) {
		return {
			_id: post._id,
			title: post.title,
			views: post.views
		}
	})
	this.body = {
		result: ret
	}
}

var preCheckNewPost = function*() {
	var id = this.sessionId
	if (id) {
		let ret = yield store.pubQueue.get(this, id)
		this.set({
			'Content-length': ret.length
		})
		this.body = ''
	}
}

var checkNewPost = function*() {
	var id = this.sessionId
	if (id) {
		this.body = yield store.pubQueue.get(this, id)
		yield store.pubQueue.del(this, id)
	}
}