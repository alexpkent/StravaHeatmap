import { Pipe } from '@angular/core';
import { TimeAgoPipe } from 'time-ago-pipe';

// tslint:disable-next-line:use-pipe-transform-interface
@Pipe({
  name: 'timeSince',
  pure: false
})
export class TimeSincePipe extends TimeAgoPipe {}
