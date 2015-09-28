var gulp = require('gulp'),
	nodemon = require('gulp-nodemon')

gulp.task('start', function() {
	nodemon({
		script: 'index.js',
		execMap: {
			js: "node --harmony"
		},
		env: {
			'NODE_ENV': 'development'
		},
		ignore: ['node_modules/**', 'statics/**']
	}).on('restart', function() {
		console.log('restarted!')
	})
})