import { Injectable } from '@angular/core';

// Phase C proof: a real Angular 18 service, downgraded for use inside the AngularJS app.
@Injectable({ providedIn: 'root' })
export class HelloAngularService {
  greet(): string {
    return 'Hello from Angular 18 (ngUpgrade hybrid)';
  }
}
