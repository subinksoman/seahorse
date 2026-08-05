/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Output, EventEmitter, Inject, ElementRef,
  OnChanges, OnDestroy, DoCheck, HostListener, SimpleChanges
} from '@angular/core';
import { OperationsCatalogueService } from '../services/operations-catalogue.service';
import '../../workflows/operations-catalogue/operations-list/operations-list.less';

// Phase C / operations-catalogue: migrated from workflows/operations-catalogue/operations-list. The
// recursive, zoom-aware multi-level operation flyout. Injects the bridged AngularJS CanvasService (for
// .scale) and the migrated Angular OperationsCatalogueService (visible-level state). $scope.$watch on the
// service level -> ngDoCheck sync; $onChanges -> ngOnChanges; $postLink wheel/mousedown stopPropagation ->
// @HostListener; the `&` selectOperation output -> @Output emitting the operation id. It hosts itself
// recursively; used only inside Angular templates so it is declared but NOT downgraded.
const TYPE_CATEGORY = 'category';
const TYPE_ITEM = 'item';

const ELEMENT_WIDTH = 200;
const ELEMENT_WIDTH_SMALLER = 180;
const ELEMENT_BORDER = 2;
const CATEGORY_HEIGHT = 40;

const ITEM_HEIGHT = 25;
const ITEM_MARGIN_TOP = 10;
const ITEM_MARGIN_BOTTOM = 5;

const CATALOG_MAX_HEIGHT = 240;

const DIRECTION_RIGHT = 'right';
const DIRECTION_LEFT = 'left';

@Component({
  standalone: false,
  selector: 'operations-list',
  template: `
    <div class="operations-list"
         [ngClass]="{
           'operations-list--smaller': currentLevel > 2,
           'operations-list--hide': currentLevel + 1 < visibleLevel
         }">
      <div class="operations-list__wrapper"
           [ngClass]="{ 'operations-list__wrapper--hide': currentLevel + 1 < visibleLevel }">
        <div *ngFor="let category of items; let i = index; trackBy: trackById"
             (mouseover)="showItem($event, i)"
             (click)="select(category)"
             [title]="category.description"
             class="operations-list__item"
             [ngClass]="{
               'operations-list__item--category': category.type === 'category',
               'operations-list__item--item': category.type === 'item',
               'operations-list__item--active': activeCategoryIndex === i
             }">
          <div class="operations-list__name">{{ category.name }}</div>
        </div>
      </div>
      <div *ngIf="selectedItems" [ngStyle]="getNextLevelStyle()" class="operations-list__next-level">
        <operations-list
          [containment]="containment"
          [direction]="direction"
          [items]="selectedItems"
          [level]="currentLevel"
          (selectOperation)="selectOperation.emit($event)"
        ></operations-list>
      </div>
    </div>
  `
})
export class OperationsListComponent implements OnChanges, OnDestroy, DoCheck {
  @Input() containment: any;
  @Input() level: number;
  @Input() direction: string;
  @Input() items: any;
  @Output() selectOperation = new EventEmitter<any>();

  currentLevel = 1;
  visibleLevel = 1;
  activeCategoryIndex: number | null = null;
  selectedItems: any = null;
  nextLevelLeft = 0;
  nextLevelTop = 0;

  constructor(
    @Inject('CanvasService') private CanvasService: any,
    private OperationsCatalogueService: OperationsCatalogueService,
    private $element: ElementRef
  ) {}

  // Replaces the legacy $scope.$watch(() => service.getVisibleCatalogueLevel()): keep the local mirror in
  // sync each change-detection pass so deeper levels hide/show as the flyout navigates.
  ngDoCheck(): void {
    const level = this.OperationsCatalogueService.getVisibleCatalogueLevel();
    if (level !== this.visibleLevel) {
      this.visibleLevel = level;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.items) {
      this.selectedItems = null;
      this.activeCategoryIndex = null;
    }
    if (changes.level && changes.level.currentValue) {
      this.currentLevel = changes.level.currentValue + 1;
    }
  }

  ngOnDestroy(): void {
    this.OperationsCatalogueService.setVisibleCatalogueLevel(1);
  }

  // Prevent the canvas from wheel-zooming / drag-panning while interacting with the flyout.
  @HostListener('wheel', ['$event'])
  onWheel(e: Event): void { e.stopPropagation(); }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: Event): void { e.stopPropagation(); }

  trackById(_index: number, category: any): any {
    return category && category.id;
  }

  getNextLevelStyle(): { [key: string]: string } {
    return {
      left: this.nextLevelLeft + 'px',
      top: this.nextLevelTop + 'px'
    };
  }

  calculateNextLevelPosition(event: any, catalogLength: number, itemsLength: number): void {
    const element = event.target;
    if (!element || !this.containment || !this.containment[0]) {
      return;
    }

    const elementBoundingRect = element.getBoundingClientRect();
    const containmentBoundingRect = this.containment[0].getBoundingClientRect();

    const nextElementWidth = (this.currentLevel > 1) ? ELEMENT_WIDTH_SMALLER : ELEMENT_WIDTH;
    const currentElementWidth = (this.currentLevel > 2) ? ELEMENT_WIDTH_SMALLER : ELEMENT_WIDTH;

    const containerBottom = containmentBoundingRect.bottom;
    const containerRight = containmentBoundingRect.right;
    const containerLeft = containmentBoundingRect.left;

    const elementTop = elementBoundingRect.top;
    const elementLeft = elementBoundingRect.left;
    const elementRight = elementBoundingRect.right;

    const nextLevelCategoryHeight = catalogLength * CATEGORY_HEIGHT;
    const nextLevelItemsMargin = (itemsLength) ? ITEM_MARGIN_BOTTOM + ITEM_MARGIN_TOP : 0;
    const nextLevelItemsHeight = itemsLength * ITEM_HEIGHT + nextLevelItemsMargin;
    const nextLevelSize = Math.min((nextLevelCategoryHeight + nextLevelItemsHeight), CATALOG_MAX_HEIGHT);
    const nextLevelHeight = nextLevelSize * this.CanvasService.scale;
    const nextLevelWidth = nextElementWidth * this.CanvasService.scale;

    this.nextLevelTop = element.offsetTop - element.parentNode.scrollTop - ELEMENT_BORDER;
    if (elementTop + nextLevelHeight > containerBottom) {
      this.nextLevelTop -= nextLevelSize - CATEGORY_HEIGHT;
    }

    if (this.direction === DIRECTION_LEFT) {
      if (elementLeft - nextLevelWidth < containerLeft) {
        this.nextLevelLeft = currentElementWidth - 2 * ELEMENT_BORDER;
        this.direction = DIRECTION_RIGHT;
      } else {
        this.nextLevelLeft = -nextElementWidth;
      }
    } else if (elementRight + nextLevelWidth < containerRight) {
      this.nextLevelLeft = currentElementWidth - 2 * ELEMENT_BORDER;
    } else {
      this.nextLevelLeft = -nextElementWidth;
      this.direction = DIRECTION_LEFT;
    }
  }

  select(operation: any): void {
    if (operation && operation.type === TYPE_ITEM) {
      this.selectOperation.emit(operation.id);
    }
  }

  showItem(event: any, index: number): void {
    if (!this.items || !this.items[index] || this.items[index].type !== TYPE_CATEGORY) {
      this.selectedItems = null;
      return;
    }
    const catalog = (this.items[index].catalog || []).map((category: any) => {
      return Object.assign({}, category, { type: TYPE_CATEGORY });
    });
    const items = (this.items[index].items || []).map((item: any) => {
      return Object.assign({}, item, { type: TYPE_ITEM });
    });
    this.selectedItems = [...catalog, ...items];
    this.calculateNextLevelPosition(event, catalog.length, items.length);
    this.OperationsCatalogueService.setVisibleCatalogueLevel(this.currentLevel + 1);
    this.activeCategoryIndex = index;
  }
}
