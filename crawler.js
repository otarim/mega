var page = require('webpage').create(),
	system = require('system'),
	url = system.args[1]

url = url.replace('?_escaped_fragment_=', '#!/')
page.open(url, function(status) {
	if (status === 'success') {
		setTimeout(function() {
			console.log(page.content)
			phantom.exit()
		}, 1000)
	} else {
		phantom.exit()
	}
})