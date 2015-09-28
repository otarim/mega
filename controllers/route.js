'use strict'

var _ = require('lodash'),
  fs = require('mz/fs'),
  path = require('path'),
  co = require('co')

module.exports = function*(app) {
  var controllers = _.without(yield fs.readdir(__dirname),
    'route.js')
  app.use('/api', function*(next) {
    var origin = this.get('origin')
    var header = {
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': origin
      }
      // if (this.method.toUpperCase() === 'POST' || this.method.toUpperCase() === 'OPTIONS') {

    // }
    this.set(header)
    yield next
  })
  for (var i = 0, l = controllers.length; i < l; i++) {
    var controller = path.resolve(__dirname, controllers[i])
    var stat = yield fs.stat(controller)
    if (stat.isFile() && path.extname(controller) === '.js') {
      require(controller)(app)
    }
  }
}