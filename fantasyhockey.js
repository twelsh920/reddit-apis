const axios = require('axios').default;
const fs = require('fs');
const markdowntable = require('markdown-table')
const moment = require('moment');
const querystring = require('querystring');
const uuid = require('uuid');
const config = require('./config.json');

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

async function main() {
    if (!config.USER_STATE) {
        const state = uuid.v4();
        const authorizeUrl = `https://www.reddit.com/api/v1/authorize?client_id=${config.CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${config.REDIRECT_URI}&duration=permanent&scope=submit,modposts`;
        config.USER_STATE = state;
        config.OAUTH = {
            INITIAL_AUTH_CODE: null
        };
        writeConfig();
        console.log(`Please authorize at ${authorizeUrl}`);
        return;
    }

    if (isExpired()) {
        await oauth();
    }

    let games = await getTodaysGames();
    let gamesTable = getGamesTable(games);
    if (gamesTable) {
        let id = await submit(gamesTable);
        await approvePost(id);
        await setSticky(id);
    }
}

function getGamesTable(games) {
    let rows = [
        ['Home', '', 'Away', '', 'Puck Drop']
    ];

    function getRecord(team) {
        return `${team.leagueRecord.wins}-${team.leagueRecord.losses}-${team.leagueRecord.ot}`;
    }

    let orderedGames = games.sort((g1, g2) => new Date(g1.gameDate).getTime() - new Date(g2.gameDate).getTime());
    for (let game of orderedGames) {
        let gameTime = moment(game.gameDate).format('h:mm A');
        let teams = game.teams;
        let home = teams.home;
        let away = teams.away;
        let row = [
            away.team.name,
            getRecord(away), 
            home.team.name,
            getRecord(home),
            gameTime
        ];
        rows.push(row);
    }

    return markdowntable(rows);
}

async function getTodaysGames() {
    try {
        const today = moment().format('YYYY-MM-DD');
        const scheduleUrl = `https://statsapi.web.nhl.com/api/v1/schedule?startDate=${today}&endDate=${today}`;
        
        let response = await axios.get(scheduleUrl);
        if (response.status !== 200) {
            throw new Error(response.status);
        }

        if (!response.data.dates) {
            throw new Error('Unexpected response from schedule api');
        } else if (!response.data.dates.length) {
            return null;
        }

        return response.data.dates[0].games;
    } catch(err) {
        throw new Error(err.message);
    }
}

async function approvePost(id) {
    try {
        const approveUrl = `https://oauth.reddit.com/api/approve`;
        const approveOptions = {
            headers: {
                "Authorization": `bearer ${config.OAUTH.ACCESS_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        const approveData = {
            id: `t3_${id}`
        };
    
        let response = await axios.post(approveUrl, querystring.stringify(approveData), approveOptions);
        if (response.status !== 200) {
            throw new Error(response.status);
        }

        if (response.data.success === false) {
            console.error(response.data);
            throw new Error('Failed to approve post');
        }
    
        console.log("Successfully approved");
    } catch(err) {
        throw new Error(err.message);
    }
}

async function setSticky(id) {
    try {
        const distinguishUrl = `https://oauth.reddit.com/api/distinguish`;
        const stickyUrl = `https://oauth.reddit.com/api/set_subreddit_sticky`;
        const modOptions = {
            headers: {
                "Authorization": `bearer ${config.OAUTH.ACCESS_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        const distinguishData = {
            api_type: 'json',
            how: 'yes',
            id: `t3_${id}`
        };
        const stickyData = {
            api_type: 'json',
            state: true,
            num: 1,
            id: `t3_${id}`
        };
    
        let response = await axios.post(distinguishUrl, querystring.stringify(distinguishData), modOptions)
            .then(() => axios.post(stickyUrl, querystring.stringify(stickyData), modOptions));
        if (response.status !== 200) {
            throw new Error(response.status);
        }

        if (!response.data.json || (response.data.json.errors && response.data.json.errors.length)) {
            console.error(response.data.json.errors);
            throw new Error('Failed to sticky post');
        }
    
        console.log("Successfully stickied");
    } catch(err) {
        console.log(err.response.data);
        throw new Error(err.message);
    }
}

async function submit(gamesTable) {
    try {
        const submitUrl = `https://oauth.reddit.com/api/submit`;
        const submitOptions = {
            headers: {
                "Authorization": `bearer ${config.OAUTH.ACCESS_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        const today = moment().format('YYYY/MM/DD');
        const submitData = {
            sr: config.SUBREDDIT_NAME,
            title: `Daily Game Thread (${today})`,
            text: gamesTable,
            kind: 'self',
            api_type: 'json'
        };

        let response = await axios.post(submitUrl, querystring.stringify(submitData), submitOptions);
        if (response.status !== 200) {
            throw new Error(response.status);
        }

        if (response.data.success === false) {
            console.error(response.data.jquery);
            throw new Error('Failed to submit post')
        }

        if (!response.data.json || !response.data.json.data || !response.data.json.data.id) {
            throw new Error('Missing url on submitted post');
        }

        console.log("Successfully posted");
        return response.data.json.data.id;
    } catch(err) {
        throw new Error(err.message);
    }
}

async function oauth() {
    try {
        const oauthTokenUrl = `https://www.reddit.com/api/v1/access_token`;
        const oauthOptions = {
            auth: {
                username: config.CLIENT_ID,
                password: config.CLIENT_SECRET
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        let oauthData = {};
        if (config.OAUTH.REFRESH_TOKEN) {
            oauthData.grant_type = 'refresh_token';
            oauthData.refresh_token = config.OAUTH.REFRESH_TOKEN
            config.OAUTH.INITIAL_AUTH_CODE = null;
        } else if (config.OAUTH.INITIAL_AUTH_CODE) {
            oauthData.grant_type = 'authorization_code';
            oauthData.code = config.OAUTH.INITIAL_AUTH_CODE;
            oauthData.redirect_uri = config.REDIRECT_URI;
        } else {
            throw new Error('Refresh token/initial auth code not set; please re-authorize app')
        }

        let response = await axios.post(oauthTokenUrl, querystring.stringify(oauthData), oauthOptions);
        if (response.status !== 200) {
            throw new Error(response.data);
        }

        if (response.data.refresh_token) {
            config.OAUTH.REFRESH_TOKEN = response.data.refresh_token;
        }

        config.OAUTH.ACCESS_TOKEN = response.data.access_token;
        config.OAUTH.EXPIRES_AT = moment().add(response.data.expires_in, 's').toDate();
        writeConfig();

        console.log('Successfully authenticated')
    } catch (err) {
        throw new Error(err.message);
    }
}

function isExpired() {
    if (!config.OAUTH.EXPIRES_AT || !config.OAUTH.ACCESS_TOKEN) {
        return true;
    }

    return moment().isAfter(moment(config.OAUTH.EXPIRES_AT));
}

function writeConfig() {
    fs.writeFileSync('config.template.json', JSON.stringify(config, null, 2))
}