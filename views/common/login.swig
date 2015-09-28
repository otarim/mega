{% extends "layout.swig" %}
{% block head %}
<link rel="stylesheet" href="/css/auth.css">
{% endblock %}

{% block body %}
<div class="mega-auth">
	<div class="containner" ng-controller="login">
		<form class="ui form attached segment">
			<div class="ui info message" ng-style="{display: data.feedBack ? 'block' : 'none'}" ng-class="{
				'error': err.loginError
			}">
		    <p ng-bind="data.msg"></p>
		  </div>
			<div class="field">
	      <label>账户名</label>
	      <input type="text" name="user" id="user">
    	</div>
    	<div class="field">
	      <label>密码</label>
	      <input type="password" name="psw" id="psw">
    	</div>
    	<div class="actions">
				<button class="ui primary button fluid" type="submit" class="btn btn-primary" ng-click="event.post()">登陆</button>
    	</div>
		</form>
		<div class="ui bottom attached warning message">
		  <i class="icon help"></i>
		  Already signed up? <a href="/reg" class="btn-reg">立即注册</a> instead.
		</div>
	</div>
</div>
{% endblock %}

{% block script %}
<script>
	angular.module('login', ['restangular'])
	.factory('req',function(Restangular){
		var api = Restangular.all('/api/auth/login')
		return {
			send: function(params){
				return api.post(params)
			}
		}
	})
	.controller('login',function($scope,$window,$timeout,req){
		$scope.data = {}
		$scope.err = {}
		$scope.event = {
			post: function(){
				req.send({
					user: document.getElementById('user').value,
					psw: document.getElementById('psw').value
				}).then(function(result){
					result = result[0]
					$scope.data.feedBack = true
					$scope.data.msg = result.msg
					if(result.code !== 200){
						$scope.err.loginError = true
					}else{
						$timeout(function(){
							$window.location = result.redirect
						},2000)
					}
				})
			}
		}
	})
	angular.bootstrap(document.querySelector('.mega-auth'),['login'])
</script>
{% endblock %}
