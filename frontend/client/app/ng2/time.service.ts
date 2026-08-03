import { Injectable } from '@angular/core';
import moment from 'moment';

// Phase C-1: pure leaf service migrated to Angular 18 (replaces common/services/time.service.js).
@Injectable({ providedIn: 'root' })
export class TimeService {
  getVerboseDateDiff(date: moment.MomentInput): string {
    const diff = moment().diff(moment(date));
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) { return 'less than a minute'; }
    if (minutes < 60) { return minutes === 1 ? 'a minute' : `${minutes} minutes`; }
    if (hours < 24) { return hours === 1 ? 'an hour' : `${hours} hours`; }
    return `${days} days`;
  }
}
