# Create a reddit app
- Create a [reddit app](https://www.reddit.com/prefs/apps) of script type
- Choose a valid redirect url for your app (e.g to your github, to reddit, whatever)
- Copy `config.template.json` to `config.json` and fill in `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` and `SUBREDDIT_NAME`

# Setting up
- Install [nodejs](https://nodejs.org/en/) if not already done
- Install dependencies with `npm install`
- Run script via the command `node fantasyhockey.js`
- On first use, you will be prompted to authorize letting your app use your reddit account (submit and modpost permissions)
- After authorizing, you will be re-directed to the url you put above but with extra query parameters in the URL e.g https://google.com?state=ABC&code=XYZ
- Copy the code query parameter from the URL to `OAUTH.INITIAL_AUTH_CODE` of `config.json`
- Subsequent authorization will be done using `OAUTH.REFRESH_TOKEN` (automatically set by script)

# Running the app
- Run script via the command `node fantasyhockey.js`

# Config
```
{
  "CLIENT_ID": string; client id of reddit app,
  "CLIENT_SECRET": string; client secret of reddit app,
  "REDIRECT_URI": string; redirect url of reddit app,
  "USER_STATE": string; unique id of an authorized user,
  "OAUTH": {
    "INITIAL_AUTH_CODE": string; the code to generate an access token immediately after authorization,
    "REFRESH_TOKEN": string; the token used to refresh access tokens after expiry,
    "ACCESS_TOKEN": string; the access token made in requests to the reddit api,
    "EXPIRES_AT": date; when the access token expires
  },
  "SUBREDDIT_NAME": string; the subreddit to post to,
  "DISABLE_REDDIT_API": boolean; when true reddit apis will not be called (only game data logged to console)
}
```