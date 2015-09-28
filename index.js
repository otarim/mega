'use strict'
var koa = require('koa'),
	fs = require('mz/fs'),
	path = require('path'),
	send = require('koa-sendfile'),
	staticServe = require('koa-static-cache'),
	router = require('koa-router')(),
	koaBody = require('koa-body'),
	redis = require('redis'),
	redisStore = require('koa-redis'),
	session = require('koa-generic-session'),
	co = require('co'),
	swig = require('koa-swig'),
	config = require('./config/config'),
	mongo = require('./config/db'),
	controllers = require('./controllers/route'),
	store = require('./controllers/common/store'),
	shortid = require('shortid'),
	app = koa()

app.use(require('./prerender'))
if (config.env === 'production') {
	app.use(require('koa-compress')({
		threshold: 256,
		flush: require('zlib').Z_SYNC_FLUSH
	}))
	app.use(require('koa-etag')())
	app.use(require('koa-fresh')())
	app.use(require('koa-html-minifier')({
			collapseWhitespace: true
		})) //should behind compress
}
app.keys = ['otarim']
app.use(session({
	store: redisStore()
}))

app.use(require('koa-error')())
app.use(require('koa-logger')())

// app.use(require('koa-charset')())

//app.use(require('koa-parameter')(app))
app.use(staticServe('./statics/', {
	maxAge: config.env === 'production' ? 365 * 24 * 60 * 60 : 0
}))

app.use(koaBody({
	multipart: true,
	formidable: {
		keepExtensions: true,
		hash: 'sha1'
	}
}))

app.context.render = swig({
	root: path.join(__dirname, 'views'),
	autoescape: true,
	cache: config.env === 'production' ? 'memory' : false,
	ext: 'swig',
	varControls: ['[[', ']]']
		// locals: locals,
		// filters: filters,
		// tags: tags,
		// extensions: extensions
})

app.init = co.wrap(function*() {
	app.context.redis = require('co-redis')(redis.createClient())
	var db = app.context.db = yield mongo.connect()
	app.context.esClient = require('./config/es')
		// index
	yield db.collection('post').ensureIndex({
		publish: true
	})
	yield db.collection('media').ensureIndex({
		url: 1
	}, {
		unique: true
	})
	app.use(function*(next) {
		if (!this.session.added) {
			this.session.added = true
			yield store.pubQueue.add(this)
		}
		yield next
	})
	app.use(router.routes()).use(router.allowedMethods())
	yield controllers(router)
		// async...
	app.listen(config.port)
})

app.init().catch(function(err) {
	console.log(err.stack)
})