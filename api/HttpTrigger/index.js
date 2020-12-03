const axios = require("axios");

module.exports = async function (context, req) {
    context.log("/activities function processed a request.");

    try {
        const authToken = await getAuthToken(context);
        context.log("auth token from storage " + authToken);
        const activities = await getActivities(authToken);

        context.res = {
            body: activities
        };
    } catch (error) {
        context.res = {
            body: error
        };
    }
};

async function getAuthToken(context) {
    let tokenInfo = context.bindings.stravaBlobIn;
    let authToken = tokenInfo.access_token;
    const now = Date.now() / 1000;

    if (tokenInfo.expires_at > now) {
        context.log("Current token is valid");
        authToken = tokenInfo.access_token;

        return authToken;
    } else {
        context.log("Current token is expired, refreshing");
        const stravaClientId = process.env.STRAVA_CLIENT_ID;
        const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;

        var response = await axios.post(
            `https://www.strava.com/api/v3/oauth/token?client_id=${stravaClientId}&client_secret=${stravaClientSecret}&grant_type=refresh_token&refresh_token=${tokenInfo.refresh_token}`,
            null
        );
        const renewal = response.data;
        authToken = renewal.access_token;

        context.log("Uploading new token");
        context.bindings.stravaBlobOut = renewal;

        return authToken;
    }
}

async function getActivities(authToken) {
    const pageSize = 200;
    let resultCount = 0;
    const activities = [];
    let page = 1;

    do {
        const activityPage = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${pageSize}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

        resultCount = activityPage.data.length;
        activities.push(...activityPage.data);

        page++;
    } while (resultCount === pageSize);

    return activities;
}
