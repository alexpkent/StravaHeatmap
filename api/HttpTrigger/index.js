const { BlobServiceClient } = require("@azure/storage-blob");
const axios = require("axios");

module.exports = async function (context, req) {
    context.log("/activities function processed a request.");
    const authToken = await getAuthToken(context);
    context.log("auth token from storage " + authToken);
    const activities = await getActivities(authToken);

    context.res = {
        body: activities,
    };
};

async function getAuthToken(context) {
    const azureBlobConnectionString = process.env.BLOB_CONNECTION_STRING;
    const stravaClientId = process.env.STRAVA_CLIENT_ID;
    const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
    azureContainerName = "strava";
    azureBlobName = "strava.json";

    const blobService = new BlobServiceClient(azureBlobConnectionString);
    const containerClient = blobService.getContainerClient(
        this.azureContainerName
    );
    const blobClient = containerClient.getBlobClient(this.azureBlobName);
    const blobData = await blobClient.download();
    const blob = await streamToString(blobData.readableStreamBody);

    let tokenInfo = JSON.parse(blob);
    let authToken = tokenInfo.access_token;
    const now = Date.now() / 1000;

    if (tokenInfo.expires_at > now) {
        context.log("Current token is valid");
        authToken = tokenInfo.access_token;

        return authToken;
    } else {
        context.log("Current token is expired, refreshing");

        try {
            var response = await axios.post(
                `https://www.strava.com/api/v3/oauth/token?client_id=${stravaClientId}&client_secret=${stravaClientSecret}&grant_type=refresh_token&refresh_token=${tokenInfo.refresh_token}`,
                null
            );
            const renewal = response.data;
            authToken = renewal.access_token;

            context.log("Uploading new token");
            const blockBlobClient = containerClient.getBlockBlobClient(
                this.azureBlobName
            );
            await blockBlobClient.upload(
                JSON.stringify(renewal),
                JSON.stringify(renewal).length
            );

            return authToken;
        } catch (error) {
            context.error(error);
        }
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

async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
}
