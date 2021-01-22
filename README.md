# Create a reddit app
- Create a [reddit app](https://www.reddit.com/prefs/apps) of script type
- Choose a valid redirect url for your app (e.g to your github, to reddit, whatever)
- Copy `config.template.json` to `config.json` and fill in `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` and `SUBREDDIT_NAME`

# Setting up oauth
- Install [nodejs](https://nodejs.org/en/) if not already done
- Install dependencies with `npm install`
- Run script via the command `node fantasyhockey.js`
- On first use, you will be prompted to authorize letting your app use your reddit account (submit and modpost permissions)
- After authorizing, you will be re-directed to the url you put above but with extra query parameters in the URL e.g https://google.com?state=ABC&code=XYZ
- Copy the code query parameter from the URL to `OAUTH.INITIAL_AUTH_CODE` of `config.json`
- Subsequent authorization will be done using `OAUTH.REFRESH_TOKEN` (automatically set by script)

# Running the app
- Run script via the command `node fantasyhockey.js`