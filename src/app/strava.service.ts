import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BlobServiceClient } from '@azure/storage-blob';
import { IStravaTokenInfo } from './IStravaTokenInfo';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  private authToken: string;

  private stravaClientId = '';
  private stravaClientSecret = '';
  // tslint:disable-next-line:max-line-length
  private azureBlobConnectionString = '';
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

  getActivities() {
    return this.http
      .get(
        `https://www.strava.com/api/v3/athlete/activities?page=1&per_page=200`,
        this.getStravaHeaders()
      )
      .toPromise();
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
