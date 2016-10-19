var App = require('../index.js');


describe('isValidEvent', function() {
  var target = App.isValidEvent;
  var tests = {
    "pull_request": true,
    "pull_request_review_comment": true,
    "issues": true,
    "issue_comment": true,
    "hoge": false,
    "pull_requests": false,
  };

  Object.keys(tests).forEach(function(key){
    var stmt = tests[key] ? "である" : "でない";
    var title = key + "はValidEvent" + stmt;
    it(title, function() {
      expect(target(key)).toBe(tests[key]);
    });
  });
});

describe('getTargets', function() {
  var target = App.getTargets;
  var data = require('./data.json');

  var tests = {
    "evalphobia": true,
    "takuya542": true,
    "kentokento": true,
    "takuma": false,
    "@evalphobia": false,
    "evalphobian": false,
  };

  Object.keys(tests).forEach(function(key){
    var stmt = tests[key] ? "いる" : "いない";
    var title = key + "はTargetに含まれて" + stmt;

    var result = {}
    result[key] = true;
    var matcher = jasmine.objectContaining(result);

    it(title, function() {
      if (tests[key]) {
        expect(target("pull_request_review_comment", data)).toEqual(matcher);
      } else {
        expect(target("pull_request_review_comment", data)).not.toEqual(matcher);
      }
    });
  });
});

describe('getMentions', function() {
  var target = App.getMentions;
  var data = require('./data.json');

  var tests = {
    "evalphobia": true,
    "kentokento": true,
    "takuya542": false,
    "takuma": false,
    "@evalphobia": false,
    "evalphobian": false,
  };

  Object.keys(tests).forEach(function(key){
    var stmt = tests[key] ? "いる" : "いない";
    var title = key + "はMentionに含まれて" + stmt;

    it(title, function() {
      if (tests[key]) {
        expect(target("pull_request_review_comment", data)).toContain(key);
      } else {
        expect(target("pull_request_review_comment", data)).not.toContain(key);
      }
    });
  });
});

describe('removeSender', function() {
  var target = App.removeSender;
  var data = require('./data.json');

  var tests = {
    "evalphobia": true,
    "kentokento": true,
    "takuya542": true,
    "bsoo": true,
    "kaneshin": true,
    "kitazato": false, // sender
  };

  var list = {
    "evalphobia": true,
    "takuya542": true,
    "kentokento": true,
    "bsoo": true,
    "kaneshin": true,
    "kitazato": true,
  }

  Object.keys(tests).forEach(function(key){
    var stmt = tests[key] ? "いる" : "いない";
    var title = key + "は結果セットに含まれて" + stmt;

    var result = {}
    result[key] = true;
    var matcher = jasmine.objectContaining(result);

    it(title, function() {
      if (tests[key]) {
        expect(target(data, list)).toEqual(matcher);
      } else {
        expect(target(data, list)).not.toEqual(matcher);
      }
    });
  });
});

describe('removeNonChannel', function() {
  var target = App.removeNonChannel;
  var data = require('./data.json');

  var tests = {
    "evalphobia": true, // channel
    "kentokento": true,
    "kaneshin": true,
    "kitazato": true, 
    "takuya542": false,
    "bsoo": false,
    "makotano": false,
  };

  var list = {
    "evalphobia": true,
    "kentokento": true,
    "kaneshin": true,
    "kitazato": true,
    "takuya542": true,
    "bsoo": true,
    "makotano": true,
  }

  Object.keys(tests).forEach(function(key){
    var stmt = tests[key] ? "いる" : "いない";
    var title = key + "は結果セットに含まれて" + stmt;

    var result = {}
    result[key] = true;
    var matcher = jasmine.objectContaining(result);

    it(title, function() {
      if (tests[key]) {
        expect(target(list)).toEqual(matcher);
      } else {
        expect(target(list)).not.toEqual(matcher);
      }
    });
  });
});

describe('createSlackMessage', function() {
  var target = App.createSlackMessage;
  var data = require('./data.json');

  var expectedTitle = "*[kitazato] Issue Comment 【PROJECT-123";
  var expectedBody = "@evalphobia こちらお願いします。 bsoo  /cc @kentokento";
  var expectedLink = "- see: https://github.com/_org_/github2slack-lambda/pull/12345#issuecomment-235586166";
  var tests = {
    "タイトルが正しい": expectedTitle, // channel
    "メッセージが正しい": expectedBody, // channel
    "リンクが正しい": expectedLink, // channel
  };

  Object.keys(tests).forEach(function(key){
    it(key, function() {
      expect(target("issue_comment", data)).toContain(tests[key]);
    });
  });
});


describe('convertName', function() {
  var target = App.convertName;

  var tests = {
    "@evalphobia": "@takuma",
    "@kentokento": "@kentokento",
  };

  Object.keys(tests).forEach(function(key){
    var title = key + 'が' + tests[key] + 'に変換されること';
    var tt = 'aaa ' + key + ' bbb';
    var expects = 'aaa ' + tests[key] + ' bbb';

    it(title, function() {
      var user = key.substring(1);
      expect(target(tt, user)).toEqual(expects);
    });
  });
});

describe('getDefaultIcon', function() {
  var target = App.getDefaultIcon;
  var title = ':octoXXX: のアイコン文字列が返却されること';
  var expects = ':octo';

  it(title, function() {
    expect(target()).toContain(expects);
  });
});

describe('runMain', function() {
  var target = App.runMain;
  var data = require('./data.json');
  var tests = {
    'evalphobia': true,
  };

  Object.keys(tests).forEach(function(key){
    it(key, function() {
      expect(target("issue_comment", data, false)).toContain(key);
    });
  });
});