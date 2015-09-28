'use strict'
var EventEmitter = require('events'),
	co = require('co'),
	moment = require('moment'),
	ObjectID = require('mongodb').ObjectID,
	esClient = require('../../config/es')

var schedules = {}

var store = require('./store')
var event = module.exports = require('co-event-wrap')(new EventEmitter)

co(function*() {
	var subscriberClient = require('co-redis')(require('redis').createClient())
	subscriberClient.psubscribe('__keyevent@' + 1 + '__:expired');
	subscriberClient.on('pmessage', function(pattern, channel, expiredKey) {
		console.log('!!!!!!')
		co(function*() {
			expiredKey = expiredKey.split(':')
			var eventType = expiredKey[0]
			switch (eventType) {
				case 'postcron':
					let key = expiredKey[1],
						schedule = schedules[key]
					yield schedule.fn(...schedule.args)
					schedules[key] = null
					delete schedules[key]
					break
			}
		})
	})
})

var _wrap = {
	post: function(postId, post, isUpdate) {
		delete post._id
		delete post.id
		post.tags = String(post.tags)
		var model = {
			index: 'mega',
			type: 'posts',
			id: String(postId),
			body: isUpdate ? {
					doc: post
				} : post
				// ttl,timeout
		}
		if (post.cron) {
			let time = new Date(post.cron) - (+new Date)
			if (time < 0) {
				time = 0
			}
			model.timeout = time
		}
		return model
	}
}

event.on('es:addPost', function*(postId, post) {
	// cron 加入搜索引擎
	yield esClient.create(_wrap.post(postId, post))
})

event.on('es:deletePost', function*(postId) {
	yield esClient.delete({
		index: 'mega',
		type: 'posts',
		id: String(postId)
	})
})

event.on('es:updatePost', function*(postId, post) {
	// 马上生效
	// cron 的处理 timeout
	yield esClient.update(_wrap.post(postId, post, true))
})

co(function*() {
	var scheduleRedis = require('co-redis')(require('redis').createClient())
	yield scheduleRedis.select(1)
	event.on('schedule:post', function*(ctx, postId, post) {
		// 清除存在的定时任务
		yield scheduleRedis.del('postcron:' + postId)
		var time = new Date(post.cron) - (+new Date)
		if (time < 0) {
			time = 1
		}
		delete post.cron
		schedules[postId] = {}
		schedules[postId].args = [postId, post]
		schedules[postId].fn = function*(postId, post) {
			postId = String(postId)
			post.publish = true
			yield this.db.collection('post').updateOne({
				_id: ObjectID(postId)
			}, {
				$set: {
					publish: true
				}
			})
			yield store.post.set(this, postId, post)
			yield store.pubQueue.push(this, postId)
			yield store.rank.add(this, postId, 0)
				// 更新搜索引擎
		}.bind(ctx)
		yield scheduleRedis.psetex('postcron:' + postId, time, '')
	})
})