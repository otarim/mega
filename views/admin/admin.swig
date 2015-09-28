{% extends "../common/layout.swig" %}

{% block head %}
<link rel="stylesheet" href="/css/admin.css">
<link rel="stylesheet" href="/bower/font-awesome/css/font-awesome.css">
<link rel='stylesheet' href="/bower/textAngular/dist/textAngular.css">
<link rel="stylesheet" href="/bower/angular-datepicker/dist/index.min.css">
{% endblock %}

{% block body %}
<div class="mega-admin">
	<div ui-view></div>
</div>
{% endblock %}

{% block script %}
<script src="/js/admin.js"></script>
<script src="/bower/textAngular/dist/textAngular-rangy.min.js"></script>
<script src="/bower/textAngular/dist/textAngular-sanitize.min.js"></script>
<script src="/bower/textAngular/dist/textAngular.min.js"></script>
<script src="/bower/angular-moment/angular-moment.min.js"></script>
<script src="/bower/angular-datepicker/dist/index.min.js"></script>
<script src="/bower/zeroclipboard/dist/ZeroClipboard.min.js"></script>
<script src="/bower/ng-clip/dest/ng-clip.min.js"></script>
<script>
	angular.module('admin',['restangular','ui.router','admin.controller'])
	// .factory()
	.config(function($stateProvider,$urlRouterProvider){
		$stateProvider
		.state('admin',{
			url: '/',
			controller: 'admin',
			templateUrl: '/views/admin/admin.html'
		}).state('admin.allPosts',{
			url: 'posts?page',
			controller: 'posts',
			templateUrl: '/views/admin/posts.html'
		}).state('admin.post',{
			url: 'post',
			controller: 'post',
			templateUrl: '/views/admin/post.html'
		}).state('admin.edit',{
			url: 'edit/:id',
			controller: 'edit',
			templateUrl: '/views/admin/post.html'
		}).state('admin.users',{
			url: 'users',
			controller: 'users',
			templateUrl: '/views/admin/users.html'
		}).state('admin.res',{
			url: 'res',
			controller: 'res',
			templateUrl: '/views/admin/res.html'
		}).state('admin.res.post',{
			url: '/post',
			controller: 'res.post',
			templateUrl: '/views/admin/res_post.html'
		}).state('admin.res.goods',{
			url: '/goods',
			controller: 'res.goods',
			templateUrl: '/views/admin/res_goods.html'
		})
	})
	angular.bootstrap(document.querySelector('.mega-admin'),['admin'])
</script>
{% endblock %}