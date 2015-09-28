'use strict'
var util = require('./common/util'),
	checkRights = require('./common/checkRights'),
	_ = require('lodash'),
	path = require('path'),
	fs = require('mz/fs'),
	ObjectID = require('mongodb').ObjectID,
	coQiniu = require('co-qiniu'),
	coQiniuConfig = require('../config/config').cdn

var store = require('./common/store')

coQiniu.config({
	ACCESS_KEY: coQiniuConfig.ACCESS_KEY,
	SECRET_KEY: coQiniuConfig.SECRET_KEY
})

module.exports = function(router) {
	router
		.get('/api/upload/post', getPostMedia) //文章配图
		.post('/api/upload/post', postUpload)
		.get('/api/upload/goods', getGoodsMedia) //产品图
		.post('/api/upload/goods', goodsUpload)
		.del('/api/upload', delMedia)
	.get('/api/suggest', suggest)
		.get('/api/search', search)
}

var postUpload = function*() {
	var prefix = yield _prefix.call(this, 'post/')
	var file = this.request.body.files.img,
		filePath = file.path,
		filename = prefix + file.hash + path.extname(filePath)

	// var insertDocument = {
	// 	owner: owner._id,
	// 	url: url,
	// 	stat: info[0]
	// }

	// 加入用户媒体库
	// try {
	// 	yield this.db.collection('media').insert(insertDocument)
	// 	yield store.media.add(this, owner._id, insertDocument)
	// } catch (e) {
	// 	// unique
	// }
	// 媒体库直接从七牛获取

	this.body = yield _upload(filePath, filename)
}

var getPostMedia = function*() {
	var ret = yield _list.call(this, 'post/')
	this.body = {
		total: ret.length,
		result: ret
	}
}

var getGoodsMedia = function*() {
	var ret = yield _list.call(this, 'goods/')
	this.body = {
		total: ret.length,
		result: ret
	}
}

var goodsUpload = function*() {
	var prefix = yield _prefix.call(this, 'goods/')
	var file = this.request.body.files.img,
		filePath = file.path,
		filename = prefix + file.hash + path.extname(filePath)
	this.body = yield _upload(filePath, filename)
}

var delMedia = function*() {
	var bucket = coQiniuConfig.bucket,
		key = this.request.query.key
	yield coQiniu.remove(bucket, key)
	this.body = {
		code: 200,
		msg: '删除成功'
	}
}

var suggest = function*() {

}

var search = function*() {

}

var _upload = function*(filePath, filename) {
	var bucket = coQiniuConfig.bucket,
		bucketDomain = coQiniuConfig.bucketDomain
	var result = yield coQiniu.upload(bucket, filename, yield fs.readFile(filePath)),
		info = yield coQiniu.stat(bucket, filename),
		url = coQiniu.getUrl(bucketDomain, filename)
	return [{
		file: url,
		stat: info[0]
	}]
}

var _list = function*(prefix) {
	var owner = yield store.user.get(this, this.session.user),
		bucketDomain = coQiniuConfig.bucketDomain
	var result = yield coQiniu.list({
		bucket: coQiniuConfig.bucket,
		prefix: owner._id + '/' + (prefix || '')
	})
	return result[0].items.map(function(item) {
		item.url = coQiniu.getUrl(bucketDomain, item.key)
		return item
	})

}

var _prefix = function*(path) {
	var owner = yield store.user.get(this, this.session.user)
	return owner._id + '/' + (path || '')
}