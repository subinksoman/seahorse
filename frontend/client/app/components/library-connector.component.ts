/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, DoCheck } from '@angular/core';
import { LibraryModalService } from '../services/library-modal.service';
import { LibraryService } from '../services/library.service';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-load-from-library/library-connector.
// A clickable "pick a library file" chip showing the selected file's name. Used only inside the (Angular)
// attribute-load-from-library template -> declared, not downgraded. The isolate two-way `fileUri` -> @Input +
// @Output; the $watchGroup(fileUri, LibraryService.getAll) label sync -> ngDoCheck. LibraryService is bridged.
@Component({
  standalone: false,
  selector: 'library-connector',
  template: `
    <div class="library-connector" (click)="openLibrary()">
      <i class="fa fa-list icon"></i>
      <div class="text">{{ label }}</div>
    </div>
  `
})
export class LibraryConnectorComponent implements DoCheck {
  @Input() fileUri: any;
  @Output() fileUriChange = new EventEmitter<any>();

  label = 'Library';

  constructor(
    private libraryModalService: LibraryModalService,
    private libraryService: LibraryService
  ) {}

  ngDoCheck(): void {
    const file = (this.libraryService as any).getFileByURI(this.fileUri);
    const next = file ? file.name : 'Library';
    if (next !== this.label) {
      this.label = next;
    }
  }

  openLibrary(): void {
    (this.libraryModalService as any).openLibraryModal('read-file').then((result: any) => {
      if (result) {
        this.fileUri = result.uri;
        this.fileUriChange.emit(result.uri);
      }
    });
  }
}
