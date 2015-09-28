{% extends "layout.swig" %}
{% block head %}
<link rel="stylesheet" href="/css/auth.css">
{% endblock %}

{% block body %}
<div class="mega-auth">
	<div class="container" ng-controller="reg">
		<form class="one-half centered">
			<div class="flash" ng-style="{display: data.feedBack ? 'block' : 'none'}" ng-class="{
				'flash-error': err.regError
			}" ng-bind="data.msg"></div>
		  <dl class="form" ng-class="{warn: err.userWarn,errored: err.userError}">
		    <dt><label>账户名</label></dt>
		    <dd><input type="text" name="user" id="user" ng-model="model.user" ng-blur="event.verify('user')"></dd>
		    <dd class="warning">账户名不能为空</dd>
		    <dd class="error">账户名已存在</dd>
		  </dl>
		  <dl class="form" ng-class="{warn: err.pswWarn,errored: err.repswError}">
		    <dt><label>密码</label></dt>
		    <dd><input type="password" name="psw" id="psw" ng-model="model.psw" ng-blur="event.verify('psw')"></dd>
		    <dd class="warning">密码不能为空</dd>
		    <dd class="error">密码输入不正确</dd>
		  </dl>
		  <dl class="form" ng-class="{warn: err.repswWarn,errored: err.repswError}">
		    <dt><label>确认密码</label></dt>
		    <dd><input type="password" name="repsw" id="repsw" ng-model="model.repsw" ng-blur="event.verify('repsw')"></dd>
		    <dd class="warning">密码不能为空</dd>
		    <dd class="error">密码输入不正确</dd>
		  </dl>
			<div class="form-actions">
				<a href="/login" class="btn-reg">已有账户?</a>
				<button type="button" class="btn btn-primary" ng-click="event.post()">注册</button>
			</div>
		</form>
	</div>
</div>
{% endblock %}

{% block script %}
<script>
	angular.module('reg', ['restangular'])
	.factory('req',function(Restangular){
		var api = Restangular.all('/api/auth/reg'),
			checkUserName = Restangular.all('/api/auth/checkUser')
		return {
			send: function(params){
				return api.post(params)
			},
			verify: function(model,cb){
				return checkUserName.post({'user': model.user})
			}
		}
	})
	.controller('reg',function($scope,$window,$timeout,req){
		$scope.model = {}
		$scope.err = {}
		$scope.data = {}
		$scope.err.stack = []
		$scope.event = {
			verify: function(field){
				console.log(field)
				var model = $scope.model
				if(!model[field]){
					$scope.err[field + 'Warn'] = true
					$scope.err.stack.push(field)
				}else{
					$scope.err[field + 'Warn'] = false
					_.pull($scope.err.stack, field)
				}
				if(field === 'user'){
					this.checkUser()
				}
				if(field === 'repsw' && model.psw !== model.repsw){
					$scope.err.stack.push(field)
					$scope.err.repswError = true
				}else{
					$scope.err.repswError = false
					_.pull($scope.err.stack, field)
				}
			},
			post: function(){
				req.send($scope.model).then(function(result){
					result = result[0]
					$scope.data.msg = result.msg
					if(result.code !== 200){
						$scope.err.regError = true
						$scope.data.msg = result.msg
					}else{
						$timeout(function(){
							$window.location = result.redirect
						},2000)
					}
				})
			},
			checkUser: function(){
				req.verify($scope.model).then(function(result){
					result = result[0]
					$scope.data.feedBack = true
					$scope.data.msg = result.msg
					if(result.code !== 200){
						$scope.err.regError = true
					}
				})
			}
		}
	})
	angular.bootstrap(document.querySelector('.mega-auth'),['reg'])
</script>
{% endblock %}
