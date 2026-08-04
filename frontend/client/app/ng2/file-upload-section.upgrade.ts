/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, ElementRef, Injector } from '@angular/core';
import { UpgradeComponent } from '@angular/upgrade/static';

// Phase C / AngularJS removal: the file-upload-section AngularJS component (drag-drop + file input,
// using the dropzone-file-upload / file-upload-change AngularJS attribute directives) stays AngularJS
// for now — those attribute directives can't be downgraded. UpgradeComponent-wrap it so the migrated
// (CDK) Angular library picker can host <file-upload-section>. No bindings.
@Directive({ standalone: false, selector: 'file-upload-section' })
export class FileUploadSectionUpgradeDirective extends UpgradeComponent {
  constructor(elementRef: ElementRef, injector: Injector) {
    super('fileUploadSection', elementRef, injector);
  }
}
