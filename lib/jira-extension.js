(function jiraExtenstion() {

  var getSprintIssues = function getSprintIssues(rapidViewId, sprintId, callback) {

    var options = {
      uri: this.makeUri('/rapid/charts/sprintreport', 'rest/greenhopper/'),
      method: 'GET',
      json: true
    };

    options.uri = options.uri + '?rapidViewId=' + rapidViewId + '&sprintId=' + sprintId;

    this.request(options, function(error, response) {
      if( response.statusCode === 404 ) {
        callback('Invalid URL');
        return;
      }

      if( response.statusCode !== 200 ) {
        callback(response.statusCode + ': Unable to connect to JIRA during sprints search');
        return;
      }

      if(response.body !== null) {
        callback(null, response.body);
      } else {
        callback('No body given');
      }
    });
  };

  exports.extend = function extend(jiraApi) {
    jiraApi.getSprintIssues = getSprintIssues;
  };

})(); //comment
