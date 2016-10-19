github2slack-lambda
----

The lambda function to send GitHub event message to Slack.  
Forked from [kawahara/github2slack-lambda](https://github.com/kawahara/github2slack-lambda)  
This version supports multi channels, custom icons and attachment message.  

See [original instruction](https://github.com/kawahara/github2slack-lambda).

## Setting

- Slack
    - Setting [Incoming Webhook](https://slack.com/apps/A0F7XDUAZ-incoming-webhooks)
- AWS SNS
    - Create topic which used from Github to lambda.
- AWS IAM
    - Create IAM user which has "sns:Publish" permission.
- AWS Lambda
    - Configure and deploy code in this repo.
    - Add event source of SNS.
- Github
    - Add `Amazon SNS` type service in Integrations & services setting.


## Configuration

### config.json

```bash
$ cp ./config.json.sample ./config.json
$ cat ./config.json

{
  // set your slack hook url
  "slack_web_hook_url": "https://hooks.slack.com/services/<your>/<slack>/<endpoint>",

  // set channels for each user.
  "channels": {
    "github_name": "#slack-channel",
    "evalphobia": "#xxx-takuma"
  },

  // set account to change mention name from github to slack.
  "account_map": {
    "@github_name": "@slack_name",
    "evalphobia": "takuma"
  },

  // set icons for the user of slack.
  "icon_map": {
    "github_name": ":baby:",
    "evalphobia": [":walking:", ":dancer:", ":bell:"]
  },

  // set default icons except for icon_map.
  "icons": [
    ":smile:",
    ":v:",
    ":pray:"
  ]
}
```


### lambda-config.js

```bash
$ npm install

...


$ cp ./lambda-config.js.sample ./lambda-config.js
$ cat ./lambda-config.js

module.exports = {
  // Set AWS access key and secret key or env/sgared credential is used.
  accessKeyId: <access key id>,  // optional
  secretAccessKey: <secret access key>,  // optional

  // Set profile name if you use particualr profile in shared credential. ($HOME/.aws/credentials)
  profile: <shared credentials profile name>, // optional for loading AWS credientail from custom profile

  region: 'us-east-1',
  handler: 'index.handler',
  role: "arn:aws:iam::000000000000:role/<role name>",
  functionName: <lambda function name>,
  timeout: 10,
  memorySize: 128
}
```


## Deploy

```bash
$ ./node_modules/.bin/gulp deploy
```

# LICENSE

This software is released under the MIT License, see LICENSE
