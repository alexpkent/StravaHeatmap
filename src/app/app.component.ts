import { Component, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { StravaService } from './strava.service';
import * as moment from 'moment';
declare var L: any;

enum View {
  Day = 1,
  Week,
  Month,
  Year,
  All
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private mapCenter = [50.883269, -0.135436];
  private mapDefaultZoom = 11;
  private currentLocation;
  activities: any;
  runCount = 0;
  rideCount = 0;
  totalDistance = 0;
  totalSeconds = 0;
  authenticating = false;
  loading = false;
  loaded = false;
  map: any;
  polylines = [];
  runPolylines = [];
  ridePolylines = [];
  runsLayer: any;
  ridesLayer: any;
  rideColor = '#2B54D4';
  runColor = '#E63419';
  lastVisibleActivity: any;
  view = View;
  currentView = View.All;

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

  filterChanged(view: View) {
    this.currentView = view;
    this.totalDistance = 0;
    this.totalSeconds = 0;
    this.lastVisibleActivity = null;
    this.runCount = 0;
    this.rideCount = 0;

    const yesterday = moment().subtract(1, 'days');
    const lastWeek = moment().subtract(1, 'weeks');
    const lastMonth = moment().subtract(1, 'months');
    const lastYear = moment().subtract(1, 'years');

    this.polylines.forEach((polyline) => {
      let show = false;

      switch (this.currentView) {
        case View.All: {
          show = true;
          break;
        }
        case View.Year: {
          if (moment(polyline.activity.start_date).isAfter(lastYear)) {
            show = true;
          }
          break;
        }
        case View.Month: {
          if (moment(polyline.activity.start_date).isAfter(lastMonth)) {
            show = true;
          }
          break;
        }
        case View.Week: {
          if (moment(polyline.activity.start_date).isAfter(lastWeek)) {
            show = true;
          }
          break;
        }
        case View.Day: {
          if (moment(polyline.activity.start_date).isAfter(yesterday)) {
            show = true;
          }
          break;
        }
      }

      if (show) {
        this.showPolyline(polyline);
      } else {
        this.hidePolyline(polyline);
      }
    });
  }

  goHome() {
    this.map.setView(this.mapCenter, this.mapDefaultZoom);
  }

  goCurrentLocation() {
    if (this.currentLocation) {
      this.map.setView(this.currentLocation);
    }
  }

  private showPolyline(polyline: any) {
    if (!polyline.visible) {
      if (this.isRun(polyline.activity)) {
        this.runsLayer.addLayer(polyline);
      }
      if (this.isRide(polyline.activity)) {
        this.ridesLayer.addLayer(polyline);
      }

      polyline.visible = true;
    }

    this.totalDistance += polyline.activity.distance;
    this.totalSeconds += polyline.activity.moving_time;
    this.lastVisibleActivity = polyline.activity;

    if (this.isRun(polyline.activity)) {
      this.runCount += 1;
    }

    if (this.isRide(polyline.activity)) {
      this.rideCount += 1;
    }
  }

  private hidePolyline(polyline: any) {
    if (polyline.visible) {
      polyline.visible = false;
      if (this.isRun(polyline.activity)) {
        this.runsLayer.removeLayer(polyline);
      }
      if (this.isRide(polyline.activity)) {
        this.ridesLayer.removeLayer(polyline);
      }
    }
  }

  private async loadHeatmap() {
    this.createPolylines(this.activities);
    this.sortPolylines();
    this.createMap();

    this.filterChanged(this.view.All);
    this.configureLocation();
  }

  private createMap() {
    const normalMap = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        opacity: 0.5,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    const darkMap = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution:
          // tslint:disable-next-line:max-line-length
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    );

    this.runsLayer = L.layerGroup(
      this.polylines.filter((p) => this.isRun(p.activity))
    );
    this.ridesLayer = L.layerGroup(
      this.polylines.filter((p) => this.isRide(p.activity))
    );

    this.map = L.map('map', {
      center: this.mapCenter,
      zoom: this.mapDefaultZoom,
      layers: [normalMap, darkMap, this.runsLayer, this.ridesLayer]
    });

    const baseMaps = {
      Standard: normalMap,
      Dark: darkMap
    };

    const overlays = {
      Runs: this.runsLayer,
      Rides: this.ridesLayer
    };

    L.control.layers(baseMaps, overlays).addTo(this.map);
  }

  private configureLocation() {
    console.log('Requesting current location');
    this.map.locate({ setView: false, maxZoom: this.mapDefaultZoom });

    this.map.on('locationfound', (e) => {
      console.log('locationfound', e);
      const radius = e.accuracy;
      this.currentLocation = e.latlng;

      L.marker(e.latlng)
        .addTo(this.map)
        .bindPopup(`You are within ${radius} meters from this point`);
    });

    this.map.on('locationerror', (e) => {
      console.log('locationerror', e);
    });
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
  }

  isRun(activity: any) {
    return activity.type === 'Run';
  }

  isRide(activity: any) {
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
