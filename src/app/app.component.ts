import { Component, OnInit } from '@angular/core';
import { StravaService } from './strava.service';

declare var L: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private mapCenter = [50.883269, -0.135436];
  activities: any;
  runCount = 0;
  rideCount = 0;
  totalDistance = 0;
  totalSeconds = 0;
  countDistance = 0;
  authenticating = false;
  loading = false;
  loaded = false;
  endRange = 0;
  rangePosition = 0;
  map: any;
  polylines = [];
  rideColor = '#2B54D4';
  runColor = '#E63419';
  showRuns = true;
  showRides = true;
  overlay = true;
  visibleCount = 0;
  lastVisibleActivity: any;

  constructor(private stravaService: StravaService) {}

  ngOnInit(): void {
    this.load();
  }

  private async load() {
    this.authenticating = true;

    await this.stravaService.getAuthToken();
    this.authenticating = false;
    this.loading = true;

    this.activities = await this.stravaService.getActivities();

    this.loading = false;
    this.loaded = true;

    this.loadHeatmap();
  }

  filterChanged() {
    this.visibleCount = 0;
    this.countDistance = 0;

    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines[i];
      this.setPolylineVisibility(polyline, i);
    }
  }

  private setPolylineVisibility(polyline: any, index: number) {
    const showActivityType =
      (this.isRun(polyline.activity) && this.showRuns) ||
      (this.isRide(polyline.activity) && this.showRides);

    const showRange = index + 1 <= this.rangePosition && this.overlay;
    const showSingle = index + 1 === this.rangePosition && !this.overlay;

    if ((showActivityType && showRange) || (showActivityType && showSingle)) {
      this.showPolyline(polyline);
    } else {
      this.hidePolyline(polyline);
    }
  }

  private showPolyline(polyline: any) {
    if (!polyline.visible) {
      polyline.addTo(this.map);
      polyline.visible = true;
    }

    this.visibleCount++;
    this.countDistance += polyline.activity.distance;
    this.lastVisibleActivity = polyline.activity;
  }

  private hidePolyline(polyline: any) {
    if (polyline.visible) {
      polyline.remove(this.map);
      polyline.visible = false;
    }
  }

  private async loadHeatmap() {
    this.map = L.map('map', {
      center: this.mapCenter,
      zoom: 11
    });

    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        opacity: 0.5,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    tiles.addTo(this.map);

    this.createPolylines(this.activities);
    this.sortPolylines();
    this.filterChanged();
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
        color: this.isRun(stream) ? this.runColor : this.rideColor,
        weight: 2,
        opacity: 0.6
      });
      polyline.visible = false;
      polyline.activity = stream;

      this.polylines.push(polyline);
    });

    this.endRange = this.polylines.length;
    this.rangePosition = this.polylines.length;
  }

  private isRun(activity: any) {
    return activity.type === 'Run';
  }

  private isRide(activity: any) {
    return !this.isRun(activity);
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
