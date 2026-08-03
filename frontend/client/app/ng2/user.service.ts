import { Injectable } from '@angular/core';

export interface SeahorseUser { id: string; }

// Phase C-1: the first real AngularJS service migrated to Angular 18. Downgraded (see
// bootstrap.ts) to replace the legacy `UserService` factory, so existing AngularJS consumers
// (e.g. the workflow-editor resolve) now use this Angular implementation unchanged.
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly user: SeahorseUser = { id: '00000000-0000-0000-0000-000000000001' };

  getSeahorseUser(): SeahorseUser {
    return this.user;
  }
}
