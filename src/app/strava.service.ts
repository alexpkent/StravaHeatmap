import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  BlobServiceClient,
  BlockBlobClient,
  BlobClient,
  ContainerClient
} from '@azure/storage-blob';
import { IStravaTokenInfo } from './IStravaTokenInfo';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  private authToken: string;

  private stravaClientId = '44881';
  private stravaClientSecret = 'de5330ef48503f576b745e9dd790dcf11fcc7b01';
  // tslint:disable-next-line:max-line-length
  private azureBlobConnectionString =
    'https://storageaccounttestab9ca.blob.core.windows.net/?sv=2019-02-02&ss=b&srt=sco&sp=rw&se=2025-04-27T16:00:28Z&st=2020-04-27T08:00:28Z&spr=https,http&sig=v8NZYLWz4fw0qPamsjnMDOfIWebMY4RROMAwbHhqjm0%3D';
  private azureContainerName = 'strava';
  private azureBlobName = 'strava.json';

  constructor(private http: HttpClient) {}

  getAuthToken() {
    const blobService = new BlobServiceClient(this.azureBlobConnectionString);
    const containerClient = blobService.getContainerClient(
      this.azureContainerName
    );
    const blobClient = containerClient.getBlobClient(this.azureBlobName);

    let tokenInfo: IStravaTokenInfo;

    console.log('Downloading token');

    return blobClient.download().then((blobData: any) => {
      return blobData.blobBody.then((blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsText(blob);
          reader.onload = () => {
            tokenInfo = JSON.parse(reader.result as string);
            console.log(tokenInfo);

            const now = Date.now() / 1000;

            if (tokenInfo.expires_at > now) {
              console.log('Current token is valid, returning it for use');
              this.authToken = tokenInfo.access_token;

              resolve();
            } else {
              console.log('Current token is expired, refreshing');

              return this.http
                .post(
                  // tslint:disable-next-line:max-line-length
                  `https://www.strava.com/api/v3/oauth/token?client_id=${this.stravaClientId}&client_secret=${this.stravaClientSecret}&grant_type=refresh_token&refresh_token=${tokenInfo.refresh_token}`,
                  null
                )
                .toPromise()
                .then((renewal: IStravaTokenInfo) => {
                  this.authToken = renewal.access_token;

                  console.log('Uploading new token');
                  containerClient.uploadBlockBlob(
                    this.azureBlobName,
                    JSON.stringify(renewal),
                    new Blob([JSON.stringify(renewal)]).size
                  );

                  resolve();
                });
            }
          };
        });
      });
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
