import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  private authToken: string;

  constructor(private http: HttpClient) {}

  getAuthToken() {
    return this.http
      .get('', { responseType: 'text' })
      .toPromise()
      .then((token: string) => (this.authToken = token));
  }

  getActivities(start: Date) {
    const after = Math.round(start.getTime() / 1000);

    return this.http
      .get(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&page=1&per_page=100`,
        this.getStravaHeaders()
      )
      .toPromise();
  }

  getActivityStream(id: number) {
    return this.http
      .get(
        `https://www.strava.com/api/v3/activities/${id}`,
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
