var url = require('url')
var child_process = require('mz/child_process')

var crawlerUserAgents = [
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'developers.google.com/+/web/snippet'
]

var extensionsToIgnore = [
  '.js',
  '.css',
  '.xml',
  '.less',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.doc',
  '.txt',
  '.ico',
  '.rss',
  '.zip',
  '.mp3',
  '.rar',
  '.exe',
  '.wmv',
  '.doc',
  '.avi',
  '.ppt',
  '.mpg',
  '.mpeg',
  '.tif',
  '.wav',
  '.mov',
  '.psd',
  '.ai',
  '.xls',
  '.mp4',
  '.m4a',
  '.swf',
  '.dat',
  '.dmg',
  '.iso',
  '.flv',
  '.m4v',
  '.torrent'
]

function shouldPreRender(options) {
  var hasExtensionToIgnore = extensionsToIgnore.some(function(extension) {
    return options.url.indexOf(extension) !== -1;
  })

  var isBot = crawlerUserAgents.some(function(crawlerUserAgent) {
    return options.userAgent.toLowerCase().indexOf(crawlerUserAgent.toLowerCase()) !== -1;
  })

  // do not pre-rend when:
  if (!options.userAgent) {
    return false
  }

  if (options.method.toUpperCase() !== 'GET') {
    return false
  }

  if (hasExtensionToIgnore) {
    return false
  }

  // do pre-render when:
  var query = url.parse(options.url, true).query
  if (query && query.hasOwnProperty('_escaped_fragment_')) {
    return true
  }

  if (options.bufferAgent) {
    return true
  }

  return isBot
}

module.exports = function* preRender(next) {
  var protocol = this.protocol
  var host = this.host
  var headers = {
    'User-Agent': this.accept.headers['user-agent']
  }

  var isPreRender = shouldPreRender({
    userAgent: this.get('user-agent'),
    bufferAgent: this.get('x-bufferbot'),
    method: this.method,
    url: this.url
  })

  var response

  // Pre-render generate the site and return
  if (isPreRender) {
    console.log(protocol + '://' + host + this.url)
    response = yield child_process.execFile('phantomjs', ['crawler.js', protocol + '://' + host + this.url])

    // body = response.body || ''
    yield next
    this.set({
      'Content-Type': 'text/html'
    })
    this.body = response[0]
  } else {
    yield next
  }
}