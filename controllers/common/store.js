'use strict'

var ObjectID = require('mongodb').ObjectID,
	_ = require('lodash')

var store = {
	get: function*(ctx, id) {
		var result = yield ctx.redis.hexists(this.key, id)
		if (result) {
			return JSON.parse(yield ctx.redis.hget(this.key, id))
		} else {
			result = yield ctx.db.collection(this.collection).findOne({
				_id: ObjectID(id)
			})
			return yield this.set(ctx, id, result)
		}
	},
	remove: function*(ctx, id) {
		yield ctx.redis.hdel(this.key, id)
	}
}

var user = _.assign({}, store, {
	key: 'mega:user',
	collection: 'user',
	set: function*(ctx, userId, info) {
		delete info.psw
		delete info.salt
		info = JSON.stringify(info)
		yield ctx.redis.hset(this.key, userId, info)
		return info
	}
})

var post = _.assign({}, store, {
	key: 'mega:post',
	collection: 'post',
	set: function*(ctx, postId, info) {
		yield ctx.redis.hset(this.key, postId, JSON.stringify(info))
		return info
	},
	hmget: function*(ctx, postIds) {
		var query = [],
			ret = [],
			queryResult
		for (var i = 0, l = postIds.length; i < l; i++) {
			var exists = yield ctx.redis.hexists(this.key, postIds[i])
			if (!exists) {
				query.push(ObjectID(postIds[i]))
			} else {
				ret.push(yield this.get(ctx, postIds[i]))
			}
		}
		if (query.length) {
			queryResult = yield ctx.db.collection(this.collection).find({
				_id: {
					$in: query
				}
			}).toArray()
			ret = ret.concat(queryResult)
			queryResult = _.groupBy(queryResult, function(post) {
				return String(post._id)
			})
			Object.keys(queryResult).forEach(function(key) {
				queryResult[key] = JSON.stringify(queryResult[key][0])
			})
			yield ctx.redis.hmset(this.key, queryResult)
		}
		return ret
	},
	incrCount: function*(ctx, postId) {
		var post = yield this.get(ctx, postId)
		post.views += 1
		yield this.set(ctx, postId, post)

		// 更新排行榜
		yield rank.incr(ctx, postId)
	},
	remove: function*(ctx, id) {
		yield ctx.redis.hdel(this.key, id)
		yield rank.remove(ctx, id)
	}
})

var rank = {
	key: 'mega:rank',
	collection: 'post',
	add: function*(ctx, postId, views) {
		if (typeof views === 'undefined') {
			var tmp = yield post.get(ctx, postId)
			views = tmp.views
		}
		yield ctx.redis.zadd(this.key, views, postId)
	},
	incr: function*(ctx, postId) {
		yield ctx.redis.zincrby(this.key, 1, postId)
	},
	remove: function*(ctx, postId) {
		// 保存 count
		// todo
		// var views = yield ctx.redis.zscore(this.key, postId)
		// yield ctx.db.collection(this.collection).update({
		// 	_id: ObjectID(postId)
		// }, {
		// 	$set: {
		// 		views: views
		// 	}
		// })
		yield ctx.redis.zrem(this.key, postId)
	}
}

var postList = {
	key: 'mega:postList',
	collection: 'post',
	push: function*(ctx, post) {
		var id = post._id
		yield ctx.redis.lpush(this.key, id)
		yield ctx.redis.lpush(this.key + '.' + post.user, id)
	},
	getAll: function*() {

	},
	get: function*(ctx, userId, from, to) {
		var ids = yield ctx.redis.lrange(this.key + '.' + userId, from, to)
		var ret = yield store.post.hmget(ctx, ids)
	}
}

var publishList = {
	key: 'mega:publishList',
	collection: 'post',
	push: function*(ctx, post) {
		var id = post._id
		yield ctx.redis.zadd(this.key, post.postDate, id)
		yield ctx.redis.zadd(this.key + '.' + post.user, post.postDate, id)
	},
	get: function*(ctx, userId, from, to) {
		var ids = yield ctx.redis.zrangebyscore(this.key + '.' + userId, from, to)
		var ret = yield store.post.hmget(ctx, ids)
	}
}

var media = {
	collection: 'media',
	get: function*(ctx, userId) {
		var result = yield ctx.redis.smembers(this.key + ':' + userId)
		if (!result.length) {
			result = yield ctx.db.collection(this.collection).find({
				owner: userId
			}, {
				_id: 0
			}).toArray()
			yield ctx.redis.sadd(this.key + ':' + userId, result.map(JSON.stringify))
			return result
		} else {
			return result.map(JSON.parse)
		}

	},
	add: function*(ctx, userId, media) {
		var exists = yield ctx.redis.exists(this.key + ':' + userId)
		if (!exists) {
			yield this.get(ctx, userId)
		}
		yield ctx.redis.sadd(this.key + ':' + userId, JSON.stringify(media))
	},
	rem: function*(ctx, userId, media) {
		yield ctx.redis.srem(this.key + ':' + userId, JSON.stringify(media))
	}
}

var pubQueue = {
	key: 'mega:pubQueue',
	add: function*(ctx) {
		yield ctx.redis.lpush(this.key, ctx.sessionId)
	},
	get: function*(ctx, id) {
		return yield ctx.redis.smembers(this.key + ':' + id)
	},
	push: function*(ctx, postId) {
		var list = yield ctx.redis.lrange(this.key, 0, -1)
		for (var i = 0, l = list.length; i < l; i++) {
			yield ctx.redis.sadd(this.key + ':' + list[i], postId)
		}
	},
	remove: function*(ctx, postId) {
		var list = yield ctx.redis.lrange(this.key, 0, -1)
		for (var i = 0, l = list.length; i < l; i++) {
			yield ctx.redis.srem(this.key + ':' + list[i], postId)
		}
	},
	del: function*(ctx, id) {
		yield ctx.redis.del(this.key + ':' + id)
	}
}

module.exports = {
	user: user,
	post: post,
	postList: postList,
	publishList: publishList,
	media: media,
	pubQueue: pubQueue,
	rank: rank
		// unPublishList: unPublishList
}