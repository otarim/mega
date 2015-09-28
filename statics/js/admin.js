angular.module('admin.controller', ['textAngular', 'restangular', 'datePicker', 'ngClipboard'])
	.config(['ngClipProvider', function(ngClipProvider) {
		ngClipProvider.setPath('/bower/zeroclipboard/dist/ZeroClipboard.swf')
	}])
	.directive('imageUpload', ['Restangular', function(Restangular) {
		return {
			scope: {
				url: '@'
			}, // {} = isolate, true = child, false/undefined = no change
			controller: function($scope, $element, $attrs, $transclude) {
				var api = Restangular.all($scope.url).withHttpConfig({
					transformRequest: angular.identity
				})
				$scope.event = {
					showModal: function() {
						$('.ui.modal.upload').modal('show')
					},
					upload: function(file) {
						if (!file) return
							// ng-change not work in input:file ?
						var fd = new FormData()
						fd.append('img', file)
						api.customPOST(fd, '', {}, {
							'Content-Type': undefined
						}).then(function(result) {
							$scope.result = result[0].file
								// $element.find('.input-block')[0].select()
						})
					}
				}
				$scope.$on('$destroy', function() {
					$('.ui.modal.upload').modal('hide').remove()
				})
			},
			restrict: 'EA',
			templateUrl: '/views/admin/common/modal.html',
			replace: true,
			link: function($scope, iElm, iAttrs, controller) {}
		}
	}])
	.directive('pagination', function() {
		return {
			scope: {
				num: '=',
				total: '=', //defined in controller
				handler: '&',
				cur: '='
			},
			controller: function($scope, $element, $attrs, $transclude) {
				$scope.config = {
					hasPrev: false
				}
				$scope.event = {
					next: function() {
						++$scope.cur
						$scope.handler({
							pageNo: $scope.cur
						})
					},
					prev: function() {
						--$scope.cur
						$scope.handler({
							pageNo: $scope.cur
						})
					}
				}
			},
			restrict: 'EA',
			templateUrl: '/views/admin/common/pagination.html',
			replace: true,
			link: function($scope, element, attributes) {
				$scope.$watch('num', function(newV, oldV) {
					if (newV) {
						$scope.num = newV
					}
				})
				$scope.$watch('total', function(newV, oldV) {
					if (newV) {
						$scope.total = newV
						$scope.config.totalPage = Math.ceil(Number($scope.total) / Number($scope.num))
					}
				})
				$scope.$watch('cur', function(newV, oldV) {
					if (newV) {
						$scope.cur = newV
					}
				})
			}
		}
	})
	.directive('file', function() {
		return {
			scope: {
				handler: '&'
			},
			controller: function($scope, $element, $attrs, $transclude) {},
			restrict: 'EA',
			template: '<input type="file" />',
			replace: true,
			link: function($scope, element, attributes) {
				element.bind('change', function(e) {
					$scope.handler({
						file: e.target.files[0]
					})
					e.target.value = ''
				})
				$scope.$on('$destroy', function() {
					element.unbind('change')
				})
			}
		}
	})
	.filter('makeThumb', function() {
		return function(input, size) {
			return input + '?imageMogr2/thumbnail/' + size + 'x' + size
		}
	})
	.factory('postBase', function(post) {
		return function($scope, type) {
			var method = {
				'post': 'post',
				'edit': 'put'
			}
			$scope.model = {
				tags: []
			}
			$scope.data = {
				mediaUrl: '/api/upload/post'
			}
			$scope.err = {}
			$scope.event = {
				getTags: function(e) {
					if (e.which === 13) {
						var val = $scope.data.tag.trim()
						if (val) {
							$scope.model.tags.push(val)
							console.log($scope.model.tags)
							$scope.data.tag = ''
						}
					}
				},
				removeTag: function(e, tag) {
					$scope.model.tags.splice($scope.model.tags.indexOf(tag), 1)
				},
				check: function() {
					var model = $scope.model
					return model.title && model.content
				},
				post: function() {
					$scope.model.publish = true
					this.send()
				},
				save: function() {
					$scope.model.publish = false
					this.send()
				},
				send: function() {
					console.log($scope.model)
					if (this.check()) {
						post[method[type]]($scope.model).then(function(result) {
							if (result.code !== 200) {
								$scope.err.postError = true
							} else {
								$scope.err.postError = false
							}
							$scope.data.feedback = result.msg
						})
					} else {
						$scope.err.postError = true
						$scope.data.feedback = '存在非空区域'
					}
				}
			}
		}
	})
	.factory('post', function(Restangular) {
		var api = Restangular.all('/api/post')
		return {
			post: function(params) {
				return api.post(params)
			},
			get: function(query) {
				return api.get('', query)
			},
			put: function(params) {
				return api.customPUT(params)
			},
			del: function(query) {
				return api.customDELETE('', query)
			}
		}
	})
	.factory('posts', function(Restangular) {
		var api = Restangular.all('/api/posts/')
		return {
			get: function(query) {
				return api.get('', query)
			}
		}
	})
	.factory('users', function(Restangular) {
		var api = Restangular.all('/api/users')
		return {
			getAll: function() {
				return api.get('')
			},
			get: function() {
				return api.get('', query)
			}
		}
	})
	.factory('rights', function(Restangular) {
		var api = Restangular.all('/api/users/rights')
		return {
			post: function(params) {
				return api.post(params)
			}
		}
	})
	.factory('resApi', function(Restangular) {
		var post = Restangular.all('/api/upload/post'),
			res = Restangular.all('/api/upload')
		return {
			getPostRes: function() {
				return post.get('')
			},
			delRes: function(query) {
				return res.customDELETE('', query)
			}
		}
	})
	.controller('admin', function($scope) {

	}).controller('posts', function($scope, posts, post, $stateParams, $timeout, $location) {
		var postFactory = post
		$scope.data = {
			status: {
				true: '已发布',
				false: '未发布'
			},
			isPublish: {
				true: '返工',
				false: '发布'
			},
			curPage: $stateParams.page || 1,
			num: 4
		}
		var getPosts = function(pageNo, num) {
			posts.get({
				pageNo: pageNo,
				num: num
			}).then(function(result) {
				$scope.data.posts = result.result
				$scope.data.total = result.total
			})
		}
		var togglePut = function(post, config, cb) {
			config.id = post._id
			postFactory.put(config).then(function(result) {
				cb && cb()
				alert('状态修改完成')
			})
		}
		$scope.event = {
			del: function(post) {
				var ok = confirm('是否要删除文章?')
				if (ok) {
					$scope.data.posts.splice($scope.data.posts.indexOf(post), 1)
					postFactory.del({
						id: post._id
					})
				}
			},
			changeStatus(post) {
				post.publish = !post.publish
				togglePut(post, {
					publish: post.publish
				})
			},
			gotoPage: function(pageNo) {
				$location.search('page', pageNo)
				getPosts(pageNo)
			}
		}
		getPosts($scope.data.curPage, $scope.data.num)
	}).controller('post', function($scope, postBase) {
		postBase($scope, 'post')
	}).controller('edit', function($scope, $stateParams, postBase, post) {
		postBase($scope, 'edit')
		post.get({
			id: $stateParams.id
		}).then(function(result) {
			result = result.result
			$scope.model.title = result.title
			$scope.model.content = result.content
			$scope.model.id = result._id
			$scope.model.tags = result.tags || []
		})
	}).controller('users', function($scope, users, rights) {
		$scope.data = {
			isAdmin: {
				true: '取消管理员',
				false: '设置管理员'
			},
			isBlock: {
				true: '取消拉黑',
				false: '拉黑'
			},
			canPost: {
				true: '禁止发布',
				false: '可以发布'
			},
			rev: true
		}
		var toggleEvent = function(user, config, cb) {
			config.id = user._id
			rights.post(config).then(function(result) {
				cb && cb(result)
				console.log(result)
			})
		}
		$scope.event = {
			toggleAdmin: function(user) {
				user.level = +!!!user.level
				toggleEvent(user, {
					level: user.level
				})
			},
			toggleBlock: function(user) {
				user.block = !user.block
				toggleEvent(user, {
					block: user.block
				})
			},
			togglePost: function(user) {
				user.post = !user.post
				toggleEvent(user, {
					post: user.post
				})
			},
			sort: function(field) {
				if (field === $scope.data.order) {
					$scope.data.rev = !$scope.data.rev
				}
				$scope.data.order = field
			}
		}
		users.getAll().then(function(result) {
			$scope.data.users = result
		})
	}).controller('res', function($scope) {
		$scope.data = {}
		$scope.$on('count', function(e, count) {
			$scope.data.count = count
		})
	}).controller('res.post', function($scope, resApi) {
		$scope.data = {}
		$scope.event = {
			del: function(key) {
				resApi.delRes({
					key: key
				}).then(function(result) {
					alert(result.msg)
				})
			},
			copy: function() {
				alert('已经复制到剪贴板')
			}
		}
		resApi.getPostRes().then(function(result) {
			$scope.$emit('count', result.total)
			$scope.data.result = result.result
				// setTimeout(function() {
				// 	$('.res_post .card').popup({
				// 		position: 'bottom center',
				// 		on: 'hover'
				// 	})
				// }, 1)
		})
	}).controller('res.goods', function($scope) {
		$scope.data = {
				mediaUrl: '/api/upload/goods'
			}
			// $scope.$emit('count', 2)
	})