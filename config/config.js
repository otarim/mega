var _ = require('lodash')

var config = {
  production: {
    db: 'mongodb://127.0.0.1:27017/mega',
    es: {
      host: 'localhost:9200',
      log: 'trace'
    }
  },
  development: {
    db: 'mongodb://127.0.0.1:27017/mega',
    es: {
      host: 'localhost:9200',
      log: 'trace'
    }
  }
}

module.exports = _.assign({}, config[process.env.NODE_ENV || 'development'], {
  env: process.env.NODE_ENV || 'development',
  port: 3000,
  cdn: {
    bucket: 'mega',
    bucketDomain: '7xkkiv.com1.z0.glb.clouddn.com',
    ACCESS_KEY: 'z0WhNRaG3AcDEvRhtgLSTqztkUg45vf0wbsg0zSW',
    SECRET_KEY: 'n7a1cwoLhHbJKq7DMg3Aq8h0eZw7jlOrYTPiO6e3'
  }
})