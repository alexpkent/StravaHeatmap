import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Activity } from './types/Activity';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  constructor(private http: HttpClient) {}

  async getActivities(): Promise<Activity[]> {
    return (await this.http.get('/api/activities').toPromise()) as Activity[];
  }
}
