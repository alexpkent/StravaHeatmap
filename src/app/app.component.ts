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
  runCount = 0;
  rideCount = 0;
  totalDistance = 0;
  totalSeconds = 0;
  authenticating = false;
  loading = false;
  loaded = false;
  endRange = 0;
  rangePosition = 0;
  map: any;
  polylines = [];

  constructor(private stravaService: StravaService) {}

  ngOnInit(): void {
    this.authenticating = true;

    this.stravaService.getAuthToken().then((_) => {
      this.authenticating = false;
      this.loading = true;

      this.stravaService.getActivities().then((activities: any[]) => {
        this.activities = activities;

        this.loading = false;
        this.loaded = true;

        this.loadHeatmap();
      });
    });
  }

  sliderChanged() {
    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines[i];

      if (i + 1 <= this.rangePosition) {
        // include run
        if (!polyline.visible) {
          polyline.addTo(this.map);
          polyline.visible = true;
        }
      } else if (i + 1 > this.rangePosition) {
        if (polyline.visible) {
          // remove run
          polyline.remove(this.map);
          polyline.visible = false;
        }
      }
    }
  }

  private async loadHeatmap() {
    this.map = L.map('map', {
      center: [50.883269, -0.135436],
      zoom: 11
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

    this.createPolylines(this.activities);
    this.sortPolylines();
    this.sliderChanged();
  }

  private createPolylines(activityStreams: any[]) {
    activityStreams.forEach((stream) => {
      this.processActivity(stream);

      if (!stream.map.summary_polyline) {
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
    this.totalDistance += activity.distance;
    this.totalSeconds += activity.elapsed_time;

    if (activity.type === 'Run') {
      this.runCount += 1;
    }
    if (activity.type === 'Ride') {
      this.rideCount += 1;
    }
  }

  distanceToMiles(meters: number) {
    return meters / 1609;
  }

  secondsToHours(time: number) {
    return time / 60 / 60;
  }
}
