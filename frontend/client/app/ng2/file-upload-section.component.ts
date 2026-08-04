/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, ViewChild, ElementRef } from '@angular/core';
import { LibraryService } from './library.service';

// Phase C / AngularJS removal: native Angular port of file-upload-section (was the AngularJS component +
// its dropzone-file-upload / file-upload-change attribute directives). A hidden <input type=file> +
// "Add file" button + a drag-drop area, all uploading via LibraryService.uploadFiles. Native means it
// works inside the CDK library picker (the UpgradeComponent version rendered the picker empty).
@Component({
  standalone: false,
  selector: 'file-upload-section',
  template: `
    <div class="file-upload-section">
      <input #uploaderInput multiple type="file" id="uploader-input" style="display: none;"
             (change)="onFileChange($event)">
      <div class="add-file">
        <button class="btn btn-grey" type="button" (click)="uploaderInput.click()">
          <i class="fa fa-plus"></i><span>Add file</span>
        </button>
      </div>
      <div #dropArea class="drop-area" (click)="uploaderInput.click()"
           (dragover)="stop($event)" (dragenter)="onDragEnter($event)"
           (drop)="onDrop($event)" (dragleave)="onDragLeave($event)">
        Drag new files here
      </div>
    </div>
  `
})
export class FileUploadSectionComponent {
  @ViewChild('dropArea', { static: true }) dropArea: ElementRef;

  constructor(private libraryService: LibraryService) {}

  onFileChange(event: any): void {
    (this.libraryService as any).uploadFiles([...event.target.files]);
    event.target.value = null;
  }

  stop(e: Event): void { e.preventDefault(); e.stopPropagation(); }

  onDragEnter(e: any): void {
    this.stop(e);
    const el = this.dropArea.nativeElement;
    el.classList.add('drag-over');
    el.textContent = 'Drop files!';
  }

  onDrop(e: any): void {
    this.stop(e);
    const el = this.dropArea.nativeElement;
    el.classList.remove('drag-over');
    el.textContent = 'Drag new files here';
    (this.libraryService as any).uploadFiles([...e.dataTransfer.files]);
  }

  onDragLeave(e: any): void {
    this.stop(e);
    const el = this.dropArea.nativeElement;
    el.classList.remove('drag-over');
    el.textContent = 'Drag new files here';
  }
}
