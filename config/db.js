'use strict'
var mongodb = require('mongodb').MongoClient,
	mongoConfig = require('./config')

// comongo.configure(mongoConfig.db)

module.exports = {
	connect: function*() {
		if (!this.db) {
			this.db = yield mongodb.connect(mongoConfig.db)
		}
		return this.db
	}
}