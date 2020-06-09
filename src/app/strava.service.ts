import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BlobServiceClient } from '@azure/storage-blob';
import { IStravaTokenInfo } from './types/IStravaTokenInfo';
import { Activity } from './types/Activity';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  private authToken: string;

  private stravaClientId = 'CLIENT_ID';
  private stravaClientSecret = 'CLIENT_SECRET';
  private azureBlobConnectionString = 'BLOB_CONNECTION';
  private azureContainerName = 'strava';
  private azureBlobName = 'strava.json';

  constructor(private http: HttpClient) {}

  async getAuthToken() {
    const blobService = new BlobServiceClient(this.azureBlobConnectionString);
    const containerClient = blobService.getContainerClient(
      this.azureContainerName
    );
    const blobClient = containerClient.getBlobClient(this.azureBlobName);

    let tokenInfo: IStravaTokenInfo;

    console.log('Downloading token');

    const blobData = await blobClient.download();
    const blob = await blobData.blobBody;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(blob);
      reader.onload = async () => {
        tokenInfo = JSON.parse(reader.result as string);
        console.log(tokenInfo);

        const now = Date.now() / 1000;

        if (tokenInfo.expires_at > now) {
          console.log('Current token is valid');
          this.authToken = tokenInfo.access_token;

          resolve();
        } else {
          console.log('Current token is expired, refreshing');

          const renewal = (await this.http
            .post(
              // tslint:disable-next-line:max-line-length
              `https://www.strava.com/api/v3/oauth/token?client_id=${this.stravaClientId}&client_secret=${this.stravaClientSecret}&grant_type=refresh_token&refresh_token=${tokenInfo.refresh_token}`,
              null
            )
            .toPromise()) as IStravaTokenInfo;

          this.authToken = renewal.access_token;

          console.log('Uploading new token');
          containerClient.uploadBlockBlob(
            this.azureBlobName,
            JSON.stringify(renewal),
            new Blob([JSON.stringify(renewal)]).size
          );

          resolve();
        }
      };
    });
  }

  async getActivities(): Promise<Activity[]> {
    const pageSize = 200;
    let resultCount = 0;
    const activities: Activity[] = [];
    let page = 1;

    do {
      const activityPage = (await this.http
        .get(
          `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${pageSize}`,
          this.getStravaHeaders()
        )
        .toPromise()) as Activity[];

      resultCount = activityPage.length;
      activities.push(...activityPage);

      page++;
    } while (resultCount === pageSize);

    return activities;
  }

  private getStravaHeaders() {
    return {
      headers: new HttpHeaders().set(
        'Authorization',
        `Bearer ${this.authToken}`
      )
    };
  }
}
