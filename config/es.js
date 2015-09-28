var elasticsearch = require('elasticsearch'),
	config = require('./config')

module.exports = new elasticsearch.Client(config.es)