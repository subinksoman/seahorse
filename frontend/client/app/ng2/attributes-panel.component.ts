/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Inject, ElementRef, OnChanges, OnDestroy, AfterViewInit, SimpleChanges
} from '@angular/core';
import { specialOperations } from '../enums/special-operations.js';
import { VersionService } from './version.service';
import { OperationsService } from './operations.service';
// NOTE: attributes-panel.less is NOT imported here — like general-data-panel.less it is not self-contained
// (@color-action etc. come from globally-imported variables); it is already loaded via the app less chain.

declare const jQuery: any;

// Phase C / deepsense-attributes: migrated from deepsense-attributes-panel/attributes-panel
// (deepsenseOperationAttributes) — the outer node/parameter panel. Downgraded as directive
// 'deepsenseOperationAttributes'; workflows-editor.html rebinds. Hosts the migrated <attributes-list> +
// <time-diff> + <deepsense-loading-spinner-sm> (Angular). Deps: bridged $rootScope/config/$sce/$uibModal +
// Angular VersionService/OperationsService + AttributesPanelService (bridged). The dead getVisibility/
// setVisibility (attributes-list now owns visibility) are dropped. uib-tooltip -> title; ng-model ->
// [value]/(input); date filter -> Angular date pipe; the notebook/error $uibModals open on fresh child
// scopes with $close; setCorrectHeight jQuery layout runs after view changes.
@Component({
  standalone: false,
  selector: 'deepsense-operation-attributes',
  template: `
    <aside class="ibox operation-attributes-panel animated fadeIn"
           [ngClass]="{ 'operation-attributes-panel__disabled': disabledMode }">
      <header class="ibox-title ibox-title--main">
        <section [hidden]="disabledMode && !node.uiName" class="ibox-title node-edition-section flex-content--no-flex m-b-n-xs">
          <p *ngIf="!nodeNameInputVisible" class="node-edition-section__editable-text"
             (click)="enableEdition()" [title]="!disabledMode ? 'Click to change name' : ''">
            {{ node.uiName || 'Enter custom name' }}
          </p>
          <div *ngIf="nodeNameInputVisible">
            <input class="form-control o-general-data-panel__editable-input"
                   [value]="nodeNameBuffer" (input)="nodeNameBuffer = $any($event.target).value"
                   (blur)="hideInput()" (keydown)="saveNewValue($event)"
                   [focus-element]="nodeNameInputVisible" />
            <span class="node-edition-section__editable-info">Press esc to <a href="" (click)="hideInput(); $event.preventDefault()">Cancel</a></span>
          </div>
        </section>
        <section class="operation-attributes-panel__details" [ngClass]="{ 'u-top-border': disabledMode && !node.uiName }">
          <div *ngIf="hasCodeEdit()" (click)="showNotebook()" class="operation-attributes-panel__open-button">
            <i class="fa fa-file-text-o"></i><span>Open notebook</span>
          </div>
        </section>
        <section class="operation-attributes-panel__details o-state" *ngIf="node.state">
          <header>
            <p class="o-state__status label" title="Status"
               [ngClass]="{
                 'label-completed': node.state.status === 'status_completed',
                 'label-failed': node.state.status === 'status_failed' || node.state.status === 'status_aborted',
                 'label-draft': node.state.status === 'status_draft',
                 'label-queued': node.state.status === 'status_queued',
                 'label-running': node.state.status === 'status_running'
               }">{{ node.state.status.replace('status_', '') }}</p>
            <button [hidden]="node.state.status !== 'status_failed'" (click)="showErrorMessage()"
                    class="btn btn-xs btn-info o-action-text o-error-btn">
              <span class="fa fa-exclamation-triangle"></span>
              <span class="o-action-text__text-element">Click here to show errors</span>
            </button>
          </header>
          <p class="o-state__time text-right navy-bg" [hidden]="!node.state.started">
            <span class="block">Execution start</span><i class="fa fa-clock-o"></i>
            <time class="text-right" [attr.datetime]="node.state.started">{{ node.state.started | date:'medium' }}</time>
          </p>
          <p class="o-state__time text-right lazur-bg" [hidden]="!node.state.ended">
            <span class="block">Execution end</span><i class="fa fa-clock-o"></i>
            <time class="text-right" [attr.datetime]="node.state.ended">{{ node.state.ended | date:'medium' }}</time>
          </p>
          <p class="o-state__time text-right gray-bg" [hidden]="!node.state.ended">
            <span class="block">Execution time</span><i class="fa fa-clock-o"></i>
            <time-diff [start]="node.state.started" [end]="node.state.ended"></time-diff>
          </p>
        </section>
      </header>
      <aside class="c-attributes-tabs clearfix">
        <ul class="nav nav-tabs c-attributes-tabs__container">
          <li class="o-tab" [ngClass]="{ 'active': selected === 'parameters' }" (click)="selected = 'parameters'"><a href="">Parameters</a></li>
          <li class="o-tab" [ngClass]="{ 'active': selected === 'ports' }" (click)="selected = 'ports'"><a href="">Ports</a></li>
        </ul>
      </aside>
      <section class="ibox-content" custom-scroll-bar [ngSwitch]="selected">
        <section class="c-ports-info" *ngSwitchCase="'ports'">
          <section *ngIf="node.input.length > 0" class="ibox c-ports-info__container">
            <div class="ibox-title"><label><i class="fa fa-square text-info m-r-xs"></i> Input types</label></div>
            <div *ngFor="let input of node.input; let ii = index" class="ibox-content c-ports-info__content">
              <strong>{{ ii }}:</strong>
              <span class="c-ports-info__item" *ngFor="let typeQualifier of input.typeQualifier; let first = first">{{ first ? '' : ' +&nbsp;' }}{{ shortType(typeQualifier) }}</span>
            </div>
          </section>
          <section *ngIf="node.originalOutput.length > 0" class="ibox c-ports-info__container">
            <div class="ibox-title"><label><i class="fa fa-circle text-info m-r-xs"></i> Output types</label></div>
            <div *ngFor="let output of node.originalOutput; let oi = index" class="ibox-content c-ports-info__content">
              <strong>{{ oi }}:</strong>
              <span class="c-ports-info__item" *ngFor="let typeQualifier of output.typeQualifier; let first = first">{{ first ? '' : ' +&nbsp;' }}{{ shortType(typeQualifier) }}</span>
            </div>
          </section>
          <section *ngIf="node.output.length > 0" class="ibox c-ports-info__container c-ports-info__container--outcomes">
            <div class="ibox-title"><label><i class="fa fa-circle text-info m-r-xs"></i> {{ disabledMode ? 'Outcomes' : 'Possible outcomes' }}</label></div>
            <div *ngFor="let output of node.output; let oi = index" class="ibox-content c-ports-info__content">
              <strong>{{ oi }}:</strong>
              <span class="c-ports-info__item" *ngFor="let typeQualifier of output.typeQualifier; let last = last">{{ shortType(typeQualifier) }}{{ last ? '' : ', ' }}</span>
            </div>
          </section>
        </section>
        <ng-container *ngSwitchCase="'parameters'">
          <attributes-list *ngIf="node.parameters"
            [isRootLevelParameter]="true"
            [parametersList]="node.parameters"
            [isInnerWorkflow]="isInnerWorkflow"
            [node]="node"
            [publicParams]="publicParams"></attributes-list>
          <deepsense-loading-spinner-sm class="text-center" *ngIf="!node.parameters"></deepsense-loading-spinner-sm>
        </ng-container>
      </section>
    </aside>
  `
})
export class AttributesPanelComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() node: any;
  @Input() isInnerWorkflow: any;
  @Input() publicParams: any;
  @Input() workflowId: any;
  @Input() disabledMode: any;

  selected = 'parameters';
  nodeNameBuffer = '';
  nodeNameInputVisible = false;
  private removeEditWorkflowListener: () => void;

  constructor(
    private host: ElementRef,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('AttributesPanelService') private AttributesPanelService: any,
    @Inject('config') private config: any,
    @Inject('$sce') private $sce: any,
    @Inject('$uibModal') private $uibModal: any,
    private version: VersionService,
    private Operations: OperationsService
  ) {
    this.removeEditWorkflowListener = this.$rootScope.$on(
      'AttributesPanel.INTERNAL.CLICKED_EDIT_WORKFLOW', (_e: any, data: any) => {
        this.$rootScope.$broadcast('AttributesPanel.OPEN_INNER_WORKFLOW', {
          workflowId: this.workflowId, nodeId: this.node.id, parameterName: data.parameterName
        });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.disabledMode) {
      if (this.disabledMode) {
        this.AttributesPanelService.setDisabledMode();
        this.AttributesPanelService.disableElements(this.host.nativeElement);
      } else {
        this.AttributesPanelService.enableElements(this.host.nativeElement);
        this.AttributesPanelService.setEnabledMode();
      }
    }
    setTimeout(() => this.setCorrectHeight());
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.setCorrectHeight());
  }

  ngOnDestroy(): void {
    if (this.removeEditWorkflowListener) { this.removeEditWorkflowListener(); }
  }

  private setCorrectHeight(): void {
    const container = this.host.nativeElement;
    // Descendant selector (not '>'): in the downgraded Angular DOM the header/tabs live inside the <aside>,
    // one level deeper than the legacy directive assumed. Sum only the panel's own header + tabs (the first
    // of each), then size the panel's main .ibox-content to fill the rest.
    const header = container.querySelector('.ibox-title--main');
    const tabs = container.querySelector('.c-attributes-tabs');
    let heightOfOthers = 0;
    if (header) { heightOfOthers += jQuery(header).outerHeight(true); }
    if (tabs) { heightOfOthers += jQuery(tabs).outerHeight(true); }
    const body = container.querySelector('.ibox-content');
    if (body) { jQuery(body).css('height', 'calc(100% - ' + heightOfOthers + 'px)'); }
  }

  shortType(typeQualifier: string): string {
    return typeQualifier.substr(typeQualifier.lastIndexOf('.') + 1, typeQualifier.length);
  }

  hasCodeEdit(): boolean {
    return !!(this.node && Object.values(specialOperations.NOTEBOOKS).includes(this.node.operationId));
  }

  getDocsHost(): any { return this.config.docsHost; }
  getDocsVersion(): any { return this.version.getDocsVersion(); }

  private getDataFrameSource(): any {
    const incomingEdge = this.node.getIncomingEdge(0);
    if (incomingEdge) {
      const { startPortId, startNodeId } = incomingEdge;
      return { nodeId: startNodeId, port: startPortId };
    }
    return {};
  }

  getNotebookUrl(): any {
    const languageMap: any = {
      [specialOperations.NOTEBOOKS.PYTHON]: 'python',
      [specialOperations.NOTEBOOKS.R]: 'r'
    };
    const notebookParams = {
      dataframeSource: this.getDataFrameSource(),
      language: languageMap[this.node.operationId]
    };
    const encodedParams = btoa(JSON.stringify(notebookParams));
    const onlineUrlPart = this.disabledMode ? 'OfflineNotebook' : 'notebooks';
    const extension = this.disabledMode ? '' : '.ipynb';
    const languageLabel = notebookParams.language === 'r' ? 'R_Notebook' : 'Python_Notebook';
    const rawName = this.node.uiName || this.node.name || languageLabel;
    const readableName = String(rawName)
      .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || languageLabel;
    const url = `${this.config.notebookHost}/${onlineUrlPart}/${this.workflowId}/${this.node.id}/${encodedParams}/${readableName}${extension}`;
    return this.$sce.trustAsResourceUrl(url);
  }

  showNotebook(): void {
    const s = this.$rootScope.$new();
    s.url = this.getNotebookUrl();
    const modal = this.$uibModal.open({
      scope: s,
      template: `<iframe style="height: calc(100% - 60px); width:100%" frameborder="0" ng-src="{{::url}}"></iframe>
                 <button type="button" class="btn btn-default pull-right" ng-click="$close()">Close</button>`,
      windowClass: 'o-modal--notebook',
      backdrop: 'static'
    });
    modal.result.finally(() => s.$destroy());
  }

  showErrorMessage(): void {
    const s = this.$rootScope.$new();
    s.node = this.node;
    const modal = this.$uibModal.open({
      size: 'lg',
      scope: s,
      template: `
        <button type="button" class="close" aria-label="Close" ng-click="$close()"><span aria-hidden="true">&times;</span></button>
        <h2>Error title:</h2>
        <pre class="o-error-trace">{{::node.state.error.title || 'No title'}}</pre>
        <h2>Error message:</h2>
        <pre class="o-error-trace">{{::node.state.error.message || 'No message'}}</pre>
        <div ng-if="::node.state.error.details.stacktrace">
          <h2>Stack trace:</h2>
          <pre class="o-error-trace o-error-full-trace">{{::node.state.error.details.stacktrace}}</pre>
        </div>
        <button type="button" class="btn btn-default pull-right" ng-click="$close()">Close</button>
        <br style="clear: right;" />`,
      windowClass: 'o-modal--error'
    });
    modal.result.finally(() => s.$destroy());
  }

  showInput(): void { this.nodeNameInputVisible = true; }
  hideInput(): void { this.nodeNameInputVisible = false; }

  enableEdition(): void {
    if (!this.disabledMode) {
      this.showInput();
      this.nodeNameBuffer = this.node.uiName;
    }
  }

  saveNewValue(event: any): void {
    if (event.keyCode === 13) {
      this.node.uiName = this.nodeNameBuffer;
      this.hideInput();
    } else if (event.keyCode === 27) {
      this.hideInput();
    }
  }
}
