/* jshint: indent:2 */
var request = require('request'),
    config  = require('./config.json');

var colors = {
  // blue
  'navy': '#000080',
  'AirforceBlue': '#5d8aa8',
  'PastelBlue': '#aec6cf',
  // red
  'amaranth': '#e52b50',
  'mulberry': '#c54b8c',
  'LightPink': '#ffb6c1',
  'OldRose': '#c08081',
  // yellow
  'citrine': '#e4d00a',
  'eggshell': '#f0ead6',
  // green
  'DollerBill': '#85bb65',
  'GrannySmithApple': '#a8e4a0',
  'MagicMint': '#aaf0d1',
  'JungleGreen': '#29ab87',
  // purple
  'LavenderBlue': '#ccccff',
  // other
  'onyx': '#0f0f0f',
  'PaleSilver': '#c9c0bb',
};

/**
  main routine

  - 1. Get issue/pull request creator.
  - 2. Get assignees.
  - 3. Get user mentioned in comment.
  - 4. Remove event user from above users.
  - 5. Get channel list from the rest of users in config.
  - 6. Change mention name from Github's to Slack's nickname
  - 7. Send message to Slack.
*/

var App = 
{
  handler: function (event, context) {
    console.log('Received GitHub event:');
    var msg = JSON.parse(event.Records[0].Sns.Message);
    var eventName = event.Records[0].Sns.MessageAttributes['X-Github-Event'].Value;
    console.log('Sender: ' + msg.sender.login);
    console.log('Event: ' + eventName);
    App.runMain(eventName, msg, context);
  },

  runMain: function(eventName, msg, context){
    // 有効なイベントでなければ終了
    if (!App.isValidEvent(eventName)) {
      context.done();
      return;
    }
    // 有効なPRアクションでなければ終了
    if (!App.isValidAction(eventName, msg)) {
      context.done();
      return;
    }

    // 起票者・アサイン・メンションを取得
    var targets = App.getTargets(eventName, msg);
    var mentions = App.getMentions(eventName, msg)
    mentions.forEach(function(v){
      targets[v] = true;
    })

    console.log("Targets: " + targets);

    // イベント送信者・チャンネル非対象者を除外する
    targets = App.removeSender(msg, targets);
    targets = App.removeNonChannel(targets);

    var channels = Object.keys(targets).filter(function(key){
      return !!config.channels[key]
    });
    if (channels.length == 0) {
      context.done();
      return;
    }

    // 重複を排除
    channels = channels.filter(function (x, i, self) {
      return self.indexOf(x) === i;
    });

    console.log("Channels: "+ JSON.stringify(channels));

    // テスト用に返却
    if (!context) {
      return channels;
    }

    // 各ユーザーのチャンネルに投稿
    var sender = App.getSender(msg);
    channels.forEach(function(key){
      var requestData = {};
      requestData = App.createNewSlackData(eventName, msg, key);

      console.log("RequestData: "+ JSON.stringify(requestData));

      request(requestData, function () {
        context.done();
      });
    })
  },

  // 有効な種類のイベントかどうか
  isValidEvent: function(eventName){
    switch (eventName) {
      case 'pull_request':
      case 'pull_request_review_comment':
      case 'issues':
      case 'issue_comment':
        return true;
    }
    return false;
  },

  // 有効な種類のアクションかどうか
  isValidAction: function(eventName, msg){
    // 除外するイベント
    console.log("ActionName: "+ msg.action)
    switch (msg.action) {
      case 'synchronize':
      case 'edited':
      case 'unassigned':
      case 'unlabeled':
        return false
    }
    return true;
  },

  // マージ済みかどうか
  isMerged: function(msg){
    if (!msg.pull_request) return false;
    return !!msg.pull_request.merged;
  },

  // 通知送信の対象者を取得する
  getTargets: function(eventName, msg){
    if (!App.isValidEvent(eventName)) { return {}; }

    var targetMap = {};

    var creator = App.getCreator(msg);
    targetMap[creator.login] = true;

    var owner = App.getOwner(msg); // repo owner
    targetMap[owner.login] = true;

    var assignee = App.getAssignee(msg);
    targetMap[assignee.login] = true;

    var assignees = App.getAssignees(msg);
    assignees.forEach(function(v){
      targetMap[v.login] = true;
    });
    return targetMap;
  },

  getOwner: function(msg){
    if (!!msg.repository) {
      return msg.repository.owner || {}
    }
    return {};
  },

  getCreator: function(msg){
    if (!!msg.issue) {
      return msg.issue.user || {}
    } else if (!!msg.pull_request) {
      return msg.pull_request.user || {}
    }
    return {};
  },

  getAssignee: function(msg){
    if (!!msg.issue) {
      return msg.issue.assignee || {}
    } else if (!!msg.pull_request) {
      return msg.pull_request.assignee || {}
    }
    return {};
  },

  getAssignees: function(msg){
    if (!!msg.issue) {
      return msg.issue.assignees || []
    } else if (!!msg.pull_request) {
      return msg.pull_request.assignees || []
    }
    return [];
  },

  getMentions: function (eventName, msg) {
    var body = '';
    switch (eventName) {
      case 'issue_comment':
      case 'pull_request_review_comment':
        body = msg.comment.body;
        break;
      case 'issues':
        body = msg.issue.body;
        break;
      case 'pull_request':
        body = msg.pull_request.body;
        break;
    }

    var mentions = body.match(/@[a-zA-Z0-9_-]+/g) || [];
    return mentions.map(function(key){
      return key.substring(1);
    });
  },

  // 発言者を取得する
  getSender: function(msg){
    if (!msg.sender) {return '';}
    return msg.sender.login;
  },

  // 発言者を除外する
  removeSender: function(msg, targets){
    // 作成関連のイベントの場合は、発言者でも除外しない
    switch (msg.action) {
      case 'opened':
      case 'closed':
      case 'reopened':
        return;
    }

    var sender = App.getSender(msg);
    delete targets[sender]
    return targets;
  },

  // チャンネル対象者以外を除外する
  removeNonChannel: function(targets){
    var validList = {};
    Object.keys(targets).forEach(function(key){
      if (!config.channels[key]) {
        return;
      }
      validList[key] = true;
    });
    return validList;
  },


  createSlackMessage: function (eventName, msg) {
    var user = msg.sender.login;
    var title = App.getSlackTitle(eventName, msg);
    var body = App.getSlackBody(eventName, msg);
    return '*['+ user + '] ' + title + ":*\n\n" + body;
  },

  getSlackTitle: function (eventName, msg) {
    switch (eventName) {
      case 'issue_comment':
        return 'Issue Comment 【' + msg.issue.title + '】';
      case 'pull_request_review_comment':
        return 'PR Comment 【' + msg.pull_request.title + '】';
      case 'issues':
        var issue = msg.issue;
        return 'Issue ' + msg.action;
      case 'pull_request':
        var pull_request = msg.pull_request;
        return 'PullRequest ' + msg.action ;
      default:
        return '';
    }
  },

  getSlackBody: function (eventName, msg) {
    var body = '';
    switch (eventName) {
      case 'issue_comment':
      case 'pull_request_review_comment':
        var comment = msg.comment;
        body += comment.body + "\n";
        body += '- see: ' + comment.html_url;
        return body
      case 'issues':
        var issue = msg.issue;
        body += '- see: ' + App.link(issue.html_url, issue.title);
        return body;
      case 'pull_request':
        var pull_request = msg.pull_request;
        body += '- see: ' + pull_request.html_url;
        return body;
      default:
        return '';
    }
  },

  // 対象のユーザーについてGithubユーザー名をSlackユーザー名に変換する
  convertName: function (body, target) {
    return body.replace(/@[a-zA-Z0-9_\-]+/g, function (key) {
      var name = key.substring(1);
      var slackName = config.account_map[name];
      var isTarget = (name == target)
      name = slackName ? slackName : name;
      name = isTarget ? '@' + name : name;
      return name
    });
  },

  link: function (url, text) {
    return '<' + url + '|' + text + '>';
  },

  createData: function (channel, sender, text) {
    var defaultName = 'ぎっはぶ';
    var data = {
      url: config.slack_web_hook_url,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      json: {
        channel: channel,
        username: defaultName,
        text: text,
        icon_emoji: App.getDefaultIcon(),
        link_names: 1
      }
    };

    if (config.icon_map[sender]){
      data.json.icon_emoji = App.getUserIcon(sender);
      data.json.username = sender;
    }
    return data;
  },

  createNewSlackData: function (eventName, msg, key) {
    var defaultName = 'ぎっはぶ';
    var data = {
      url: config.slack_web_hook_url,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      json: {
        channel: config.channels[key],
        username: defaultName,
        icon_emoji: App.getDefaultIcon(),
        link_names: 1
      }
    };

    var sender = App.getSender(msg);
    if (config.icon_map[sender]){
      data.json.icon_emoji = App.getUserIcon(sender);
      data.json.username = sender;
    }

    data.json.attachments = App.slackAttachData(eventName, msg, key);
    return data;
  },


  slackAttachData: function (eventName, msg, key) {
    attach = {};
    attach.author_name = App.getSender(msg);
    attach.pretext = App.slackPretext(eventName, msg);
    attach.title = App.slackTitle(eventName, msg);
    attach.title_link = App.slackTitleLink(eventName, msg);
    attach.fallback = attach.title + ' (' + attach.title_link + ')';
    attach.text = App.convertName(App.slackText(eventName, msg), key);
    attach.color = App.slackColor(eventName, msg);
    attach.fields = App.slackFields(msg);
    attach.thumb_url = App.slackThumbUrl(msg);
    attach.footer = App.slackFooter(msg);
    return [attach];
  },

  slackPretext: function (eventName, msg) {
    var pretext = ''
    switch (eventName) {
      case 'issue_comment':
        return 'Issue Comment';
      case 'pull_request_review_comment':
        return 'PR Comment:';
      case 'issues':
        return 'Issue: ' + msg.action;
      case 'pull_request':
        if (msg.action == 'closed' && App.isMerged(msg)) return 'PullRequest: merged';
        return 'PullRequest: ' + msg.action;
      default:
        return '';
    }
  },

  slackTitle: function (eventName, msg) {
    switch (eventName) {
      case 'issues':
      case 'issue_comment':
        return msg.issue.title;
      case 'pull_request':
      case 'pull_request_review_comment':
        return msg.pull_request.title;
      default:
        return 'unknown';
    }
  },

  slackTitleLink: function (eventName, msg) {
    switch (eventName) {
      case 'issue_comment':
      case 'pull_request_review_comment':
        return msg.comment.html_url;
      case 'issues':
        return msg.issue.html_url;
      case 'pull_request':
        return msg.pull_request.html_url;
      default:
        return 'unknown';
    }
  },

  slackText: function (eventName, msg) {
    var body = '';
    switch (eventName) {
      case 'issue_comment':
      case 'pull_request_review_comment':
        var comment = msg.comment;
        return comment.body;
      case 'issues':
        body = msg.issue.body;
        break;
      case 'pull_request':
        body = msg.pull_request.body;
        break;
      default:
        return 'unknown';
    }

    switch (msg.action) {
      case 'closed':
      case 'labeled':
      case 'unlabeled':
        return '';
    }

    return body;
  },

  slackColor: function (eventName, msg) {
    var body = '';
    switch (eventName) {
      case 'issue_comment':
      case 'pull_request_review_comment':
        return colors['AirforceBlue'];
    }

    switch (msg.action) {
      case 'created':
        return colors['GrannySmithApple'];
      case 'closed':
        if (App.isMerged(msg)) return colors['LavenderBlue'];
        return colors['onyx'];
      case 'labeled':
        return colors['citrine'];
      case 'unlabeled':
        return colors['eggshell'];
      case 'assigned':
        return colors['amaranth'];
      case 'unassigned':
        return colors['OldRose'];
    }
    return colors['PaleSilver'];
  },

  slackFields: function (msg) {
    var fields = [];

    targetMap = {};
    var assignee = App.getAssignee(msg);
    targetMap[assignee.login] = true;
    var assignees = App.getAssignees(msg);
    assignees.forEach(function(v){
      targetMap[v.login] = true;
    });
    assignee = Object.keys(targetMap).join(" ")
    if (!!assignee){
      fields.push({
        "title": "Assignee",
        "value": assignee,
        "short": true,
      });
    }

    if (!!msg.label) {
      fields.push({
        "title": "Label",
        "value": msg.label.name,
        "short": true,
      });
    }

    return fields;
  },

  slackThumbUrl: function (msg) {
    if (!msg.sender) return;
    return msg.sender.avatar_url;
  },

  slackFooter: function (msg) {
    if (!msg.repository) return;
    return msg.repository.full_name;
  },

  getUserIcon: function (name) {
    var val = config.icon_map[name];
    return App.getRandom(val);
  },

  getDefaultIcon: function () {
    return App.getRandom(config.icons);
  },

  getRandom: function (arr) {
    if (!Array.isArray(arr)) {
      return arr;
    }

    var keys = Object.keys(arr);
    var index = keys[Math.floor(Math.random() * keys.length)];
    return arr[index];
  }
}

module.exports = App
