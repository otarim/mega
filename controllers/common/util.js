'use strict'
var crypto = require('crypto'),
	store = require('./store')

var request = require('co-request'),
	queryString = require('querystring'),
	cheerio = require('cheerio')

module.exports = {
	getIncId: function*(ctx) {
		var cl = yield ctx.db.collection('ids')
			// co-mongo lack findOneAndUpdate function
		var id = yield cl.findOneAndUpdate({
			name: 'user'
		}, {
			'$inc': {
				id: 1
			}
		}, {
			new: true
		})
		return id.value['id']
	},
	generateSalt: function() {
		return crypto.randomBytes(parseInt(Math.random() * 32, 10)).toString('base64')
	},
	sign: function(psw, salt) {
		return crypto.createHash('md5').update(psw).update(salt).digest('hex')
	},
	websafe: (function() {
		var safe = function(html) {
			return String(html)
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
		}
		return function(html) {
			if (typeof html === 'string') {
				return safe(html)
			} else if (Array.isArray(html)) {
				return html.map(safe)
			}
		}
	})(),
	convertPost: function*(ctx, posts) {
		if (!Array.isArray(posts)) {
			posts = [].concat(posts)
		}
		for (let i = 0, l = posts.length; i < l; i++) {
			let user = yield store.user.get(ctx, posts[i].user)
			posts[i].user = {
				_id: user._id,
				uid: user.uid,
				user: user.user
			}
		}
		return posts
	},
	translate: (function() {
		const TRANSLATEURL = 'https://translate.google.com/'
		return function*(config) {
			var url = TRANSLATEURL + '?' + queryString.stringify({
				langpair: config.src + '|' + config.dest,
				text: config.q
			})
			var req = yield request({
				url: url,
				method: 'get',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36'
				}
			})
			var $ = cheerio.load(req.body)
			return $('#result_box').text()
		}
	})()
}