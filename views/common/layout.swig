<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MEGA</title>
  <link rel="stylesheet" href="/css/font.css">
  <link rel="stylesheet" href="/bower/semantic-ui/dist/semantic.min.css">
  {% block head %}{% endblock %}
</head>
<body>
  {% block body %}{% endblock %}
</body>
<script src="/bower/jquery/dist/jquery.min.js"></script>
<script src="/bower/semantic-ui/dist/semantic.min.js"></script>
<script src="/bower/angular/angular.js"></script>
<script src="/bower/angular-ui-router/release/angular-ui-router.js"></script>
<script src="/bower/lodash/lodash.js"></script>
<script src="/bower/restangular/dist/restangular.js"></script>
{% block script %}{% endblock %}
</html>
