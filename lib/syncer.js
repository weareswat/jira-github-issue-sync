(function syncer() {

  var JiraApi = require('jira').JiraApi;
  var GithubApi = require('github');
  var _ = require('underscore');
  var async = require('async');
  var jiraExtension = require('./jira-extension.js');
  var context = {};

  var configApis = function configApis(config) {
    var apis = { jira: {} };
    apis.jira.default = new JiraApi(
      config.jira.protocol,
      config.jira.host,
      config.jira.port,
      config.jira.user,
      config.jira.password,
      config.jira.defaultApi.version
    );
    apis.jira.greenhopper = new JiraApi(
      config.jira.protocol,
      config.jira.host,
      config.jira.port,
      config.jira.user,
      config.jira.password,
      config.jira.greenhopper.version
    );
    jiraExtension.extend(apis.jira.greenhopper);

    apis.github = new GithubApi({version: "3.0.0"});
    apis.github.authenticate(config.github.auth);
    return apis;
  };
  
  var getCurrentSprint = function getCurrentSprint(callback) {
    context.api.jira.greenhopper.findRapidView(context.config.jira.project, function(error, rapidView) {
      context.rapidView = rapidView;
      context.api.jira.greenhopper.getLastSprintForRapidView(rapidView.id, function(error, sprint) {
        context.sprint = sprint;
        callback(sprint);
      });
    });
  };

  var checkIfMilestoneExists = function checkIfMilestoneExists(sprint, callback) {
    var msg = _.extend(context.config.github, {state:'open'});
    context.api.github.issues.getAllMilestones(msg, function(error, milestones) {
      var milestone = _.find(milestones, function(milestone) { return milestone.title == sprint.name;});
      if( milestone ) {
        context.milestone = milestone;
        console.log(' - Exists');
        callback(error, true);
      } else {
        console.log(' - Not found');
        callback(error, false);
      }
    });
  };

  var createMilestone = function createMilestone(sprint, callback) {
    var createMilestoneMsg = _.extend(context.config.github, {title: sprint.name, state:'open'});
    context.api.github.issues.createMilestone(createMilestoneMsg, function(error, result) {
      console.log(' - New milestone created');
      callback(null);
    });
  };

  var buildMilestone = function buildMilestone(callback) {
    getCurrentSprint(function operateSprint(sprint) {
      console.log('Sprint: ' + sprint.name);
      checkIfMilestoneExists(sprint, function milestoneProbe(error, exists) {
        if(exists) {
          // update?
          callback(null);
        } else {
          createMilestone(sprint, callback);
        }
      });
    });
  };

  var generateGithubIssue = function generateGithubIssue(issues, callback, masterCallback) {
    var issue = issues.pop();
    console.log(' - ' + issue.typeName + ':' + issue.key );
    if(issue.typeName === "Task" || issue.typeName === "Bug" ) {
      generateGithubIssues(issues, null, masterCallback);
    } else {
      console.log('\t- Ignored');
      generateGithubIssues(issues, null, masterCallback);
    }
    
  };

  var generateGithubIssues = function generateGithubIssues(issues, callback, masterCallback) {
    if(_.isEmpty(issues) ) {
      masterCallback(null);
    } else {
      generateGithubIssue(issues, generateGithubIssues, masterCallback);
    }
  };

  var createJiraTasksOnGithub = function createJiraTasksOnGithub(callback) {
    context.api.jira.greenhopper.getSprintIssues(context.rapidView.id, context.sprint.id, function(error, result) {
      var issues = _.union(result.contents.completedIssues, result.contents.incompletedIssues);
      console.log('Sprint issues: ' + issues.length);
      generateGithubIssues(issues, null, callback);
    });
  };

  var errorLog = function(error) {
    if(error) {
      console.log(err);
    }
  };

  exports.process = function process(config) {
    context.config = config;
    context.api = configApis(config);
    async.series([
      buildMilestone,
      createJiraTasksOnGithub
    ], errorLog);

    return;
    context.api.jira.default.searchJira("project=" + config.jira.project +" and sprint=1", {fields:["*all"]}, function(error, list) {
      console.log(error);
      console.log(list);
      console.log(list.issues.length);
      console.log(list.issues[0]);
    });
  };

})();
