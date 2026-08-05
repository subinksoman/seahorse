/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { RootScopeService } from './root-scope.service';

// THE FLIP: these two string tokens used to bridge AngularJS core into Angular DI; both are now NATIVE.
//   - '$rootScope' resolves to the RootScopeService emulator (event bus + watchers + shared editor state
//     + change-detection kicks) — a drop-in for the ~30 @Inject('$rootScope') consumers, no AngularJS.
//   - 'config' resolves to window.__seahorseConfig (set by config.js from the base config + dockerConfig).
export function configFactory(): any { return (window as any).__seahorseConfig; }

export const upgradedProviders: any[] = [
  { provide: '$rootScope', useExisting: RootScopeService },
  { provide: 'config', useFactory: configFactory }
];
