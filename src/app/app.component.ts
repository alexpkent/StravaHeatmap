import { Component, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { StravaService } from './strava.service';

declare var L: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private mapCenter = [50.883269, -0.135436];
  private mapDefaultZoom = 11;
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
  mapBackground: any;
  polylines = [];
  rideColor = '#2B54D4';
  runColor = '#E63419';
  showRuns = true;
  showRides = true;
  overlay = true;
  showMap = true;
  visibleCount = 0;
  lastVisibleActivity: any;

  constructor(
    private stravaService: StravaService,
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private async load() {
    this.authenticating = true;

    await this.stravaService.getAuthToken();
    this.authenticating = false;
    this.loading = true;

    this.activities = await this.stravaService.getActivities();
    this.loadHeatmap();

    this.loading = false;
    this.loaded = true;
  }

  filterChanged() {
    this.visibleCount = 0;
    this.totalDistance = 0;
    this.totalSeconds = 0;
    this.lastVisibleActivity = null;
    this.runCount = 0;
    this.rideCount = 0;

    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines[i];
      this.setPolylineVisibility(polyline, i);
    }
  }

  showMapChanged() {
    if (this.showMap) {
      this.mapBackground.addTo(this.map);
    } else {
      this.mapBackground.remove(this.map);
    }
  }

  goHome() {
    this.map.setView(this.mapCenter, this.mapDefaultZoom);
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
    this.totalDistance += polyline.activity.distance;
    this.totalSeconds += polyline.activity.moving_time;
    this.lastVisibleActivity = polyline.activity;

    if (polyline.activity.type === 'Run') {
      this.runCount += 1;
    }

    if (polyline.activity.type === 'Ride') {
      this.rideCount += 1;
    }
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
      zoom: this.mapDefaultZoom
    });

    this.mapBackground = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        opacity: 0.5,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    this.mapBackground.addTo(this.map);

    this.createPolylines(this.activities);
    this.sortPolylines();
    this.filterChanged();
  }

  private createPolylines(activityStreams: any[]) {
    activityStreams.forEach((stream) => {
      if (!stream.map.summary_polyline) {
        return;
      }

      const coordinates = L.Polyline.fromEncoded(
        stream.map.summary_polyline
      ).getLatLngs();
      const polyline = L.polyline(coordinates, {
        color: this.isRun(stream) ? this.runColor : this.rideColor,
        weight: 3,
        opacity: 0.6
      });
      polyline.visible = false;
      polyline.activity = stream;
      polyline.bindPopup(this.createPolylinePopup(stream));

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

  private createPolylinePopup(activity: any) {
    return (
      `<b><a href="https://www.strava.com/activities/${activity.id}" target="_blank">${activity.name}</a></b> | ` +
      `${this.datePipe.transform(activity.start_date, 'shortDate')}<br>` +
      `Distance: ${this.decimalPipe.transform(
        this.distanceToMiles(activity.distance),
        '1.0-1'
      )} Miles<br>` +
      `Time: ${this.getDuration(activity.moving_time)}`
    );
  }

  private sortPolylines() {
    this.polylines = this.polylines.sort((a, b) => {
      const dateA = new Date(a.activity.start_date);
      const dateB = new Date(b.activity.start_date);

      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
  }

  distanceToMiles(meters: number) {
    return meters / 1609;
  }

  secondsToHours(time: number) {
    return time / 60 / 60;
  }

  private getDuration(durationInSeconds: number) {
    try {
      const hours = Math.floor(durationInSeconds / 60 / 60);
      const minutes = Math.floor(durationInSeconds / 60) - hours * 60;
      const seconds = durationInSeconds % 60;

      let formatted = '';

      if (hours > 0) {
        formatted += hours.toString() + ':';
      }

      formatted +=
        minutes.toString().padStart(2, '0') +
        ':' +
        seconds.toString().padStart(2, '0');

      return formatted;
    } catch (error) {
      return '';
    }
  }
}
