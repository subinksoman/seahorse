import { Injectable } from '@angular/core';

// Phase C-1: pure leaf service migrated to Angular 18; downgraded to replace the AngularJS
// `UUIDGenerator` service (client/app/common/services/uuid-generator.js).
@Injectable({ providedIn: 'root' })
export class UUIDGenerator {
  private part(): string {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  generateUUID(): string {
    return (
      this.part() + this.part() + '-' +
      this.part() + '-' +
      this.part() + '-' +
      this.part() + '-' +
      this.part() + this.part() + this.part()
    );
  }
}
