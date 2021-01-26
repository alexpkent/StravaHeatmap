import { Map } from './Map';
export class Activity {
  id: number;
  name: string;
  map: Map;
  type: string;
  // tslint:disable-next-line:variable-name
  start_date: string;
  distance: number;
  // tslint:disable-next-line:variable-name
  moving_time: number;
  external_id: string;
}
