var defer = require('co-defer'),
	co = require('co'),
	config = require('./config/config'),
	redis = require('co-redis')(require('redis').createClient()),
	ObjectID = require('mongodb').ObjectID,
	mongo = require('./config/db')

co(function*() {
	var db = yield mongo.connect()
		// 每60分钟同步一次 rank 表
	defer.setInterval(function*() {
		var scan = yield redis.zscan('mega:rank', 0)
		var index = 0,
			views = scan[1],
			hash = {}
		while (index < views.length) {
			hash[views[index]] = +views[index + 1]
			index += 2
		}
		// update db
		for (var id in hash) {
			if (hash.hasOwnProperty(id)) {
				yield db.collection('post').findOneAndUpdate({
					_id: ObjectID(id)
				}, {
					'$set': {
						views: hash[id]
					}
				})
			}
		}
	}, 1e3 * 3600)
})