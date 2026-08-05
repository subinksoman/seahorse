import { Injectable } from '@angular/core';
import * as _ from 'lodash';

// Phase C-1: pure leaf service migrated to Angular 18 (replaces common/helpers/helpers.service.js).
@Injectable({ providedIn: 'root' })
export class HelpersService {
  sliding<T>(array: T[], slidingWindow: number): T[][] {
    const iterations = array.length - slidingWindow + 1;
    return _.range(0, iterations).map((i) => array.slice(i, i + slidingWindow));
  }
}
