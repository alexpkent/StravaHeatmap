import { Component, OnInit } from '@angular/core';
import { StravaService } from './strava.service';

declare var L: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'StravaHeatmap';
  activities: any;
  totalDistance = 0;
  totalSeconds = 0;
  totalCalories = 0;
  authenticating = false;
  loading = false;
  loaded = false;
  endRange = 0;
  rangePosition = 0;
  map: any;
  coronaStartDate = new Date(2020, 1, 12);
  polylines = [];

  constructor(private stravaService: StravaService) {}

  ngOnInit(): void {
    this.authenticating = true;

    this.stravaService.getAuthToken().then((_) => {
      this.authenticating = false;
      this.loading = true;

      this.stravaService
        .getActivities(this.coronaStartDate)
        .then((activities: any[]) => {
          this.activities = activities;

          this.loading = false;
          this.loaded = true;

          this.loadHeatmap();
        });
    });
  }

  sliderChanged() {
    console.log(this.rangePosition);

    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines[i];

      if (i + 1 <= this.rangePosition) {
        // include run
        if (!polyline.visible) {
          console.log('Adding run ' + i);

          polyline.addTo(this.map);
          polyline.visible = true;
        }
      } else if (i + 1 > this.rangePosition) {
        if (polyline.visible) {
          // remove run
          console.log('Removing run ' + i);

          polyline.remove(this.map);
          polyline.visible = false;
        }
      }
    }
  }

  private async loadHeatmap() {
    this.map = L.map('map', {
      center: [50.844227, -0.144671],
      zoom: 13
    });

    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    tiles.addTo(this.map);

    const activityStreams = [];
    await Promise.all(
      this.activities.map(async (activity: { id: number }) => {
        console.log('getting activity' + activity.id);
        const stream: any = await this.stravaService.getActivityStream(
          activity.id
        );

        console.log('loaded activity' + activity.id);
        activityStreams.push(stream);
      })
    );

    console.log('adding runs to map');
    this.createPolylines(activityStreams);
    this.sortPolylines();
    this.sliderChanged();

    // this.activities.forEach((activity) => {
    //   this.stravaService.getActivityStream(activity.id).then((stream: any) => {
    //     const coordinates = L.Polyline.fromEncoded(
    //       stream.map.summary_polyline
    //     ).getLatLngs();
    //     const polyline = L.polyline(coordinates, {
    //       color: 'red',
    //       weight: 2,
    //       opacity: 0.7,
    //       visible: true,
    //       activity: stream
    //     }).addTo(this.map);
    //     this.polylines.push(polyline);
    //   });
    // });
  }

  private createPolylines(activityStreams: any[]) {
    activityStreams.forEach((stream) => {
      this.processActivity(stream);

      if (!stream.map.polyline) {
        return;
      }

      const coordinates = L.Polyline.fromEncoded(
        stream.map.summary_polyline
      ).getLatLngs();
      const polyline = L.polyline(coordinates, {
        color: 'red',
        weight: 2,
        opacity: 0.7
      });
      polyline.visible = false;
      polyline.activity = stream;

      this.polylines.push(polyline);
      console.log('polyline count' + this.polylines.length);
    });

    this.endRange = this.polylines.length;
    this.rangePosition = this.polylines.length;
  }

  private sortPolylines() {
    this.polylines = this.polylines.sort((a, b) => {
      const dateA = new Date(a.activity.start_date);
      const dateB = new Date(b.activity.start_date);

      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
  }

  private processActivity(activity) {
    if (activity.type === 'Run') {
      this.totalDistance += activity.distance;
      this.totalSeconds += activity.elapsed_time;
      this.totalCalories += activity.calories;
    }
  }

  distanceToMiles(meters: number) {
    return meters / 1609;
  }

  secondsToHours(time: number) {
    return time / 60 / 60;
  }
}
