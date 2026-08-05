/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http.service';
import { WorkflowService } from './workflow.service';
import buildPresetValidator from '../common/services/preset-validator.js';

// Phase C / bootstrap inversion (step 4): native port of common/services/preset.service.js (cluster
// preset CRUD + validation + name-in-use check), consumed by the migrated choose-cluster / preset CDK
// modals. The tiny PresetsApiService (ApiBaseClass over $http) is folded in here — same as
// DatasourcesApiService — using the native HttpService + the bridged `config` constant. The ajv
// validator is the shared preset-validator.js (also used by the legacy AngularJS PresetService).
// Replaces the bridged 'PresetService' injectable so the ng2 side no longer reaches into AngularJS DI.
@Injectable({ providedIn: 'root' })
export class PresetService {
  private readonly apiUrl: string;
  private readonly servicePath: string;
  private readonly validate = buildPresetValidator();
  private presets: any;

  constructor(
    private http: HttpService,
    private workflowService: WorkflowService,
    @Inject('config') config: any
  ) {
    this.apiUrl = `${config.apiHost}:${config.apiPort}`;
    this.servicePath = `/${config.urlApiVersion}/presets`;
    // Parity with the legacy service, which fetched on first instantiation. Swallow here — every
    // consumer re-fetches with its own error handling (choose-cluster ngOnInit).
    this.fetch().catch(() => {});
  }

  private endpointUrl(path = ''): string {
    return `${this.apiUrl}${this.servicePath}${path}`;
  }

  fetch(): Promise<any> {
    return this.http.get(this.endpointUrl())
      .then((result) => { this.presets = result.data; return result.data; })
      .then(() => this.workflowService.fetchCluster(this.workflowService.getRootWorkflow()));
  }

  getAll(): any {
    return this.presets;
  }

  createPreset(presetCandidate: any): Promise<any> {
    return this.http.post(this.endpointUrl(), presetCandidate).then(() => this.fetch());
  }

  deletePreset(id: any): Promise<any> {
    return this.http.delete(this.endpointUrl(`/${id}`)).then(() => this.fetch());
  }

  updatePreset(presetCandidate: any): Promise<any> {
    return this.http.post(this.endpointUrl(`/${presetCandidate.id}`), presetCandidate).then(() => this.fetch());
  }

  savePreset(presetCandidate: any): Promise<any> {
    return presetCandidate.id ? this.updatePreset(presetCandidate) : this.createPreset(presetCandidate);
  }

  isValid(preset: any): boolean {
    return this.validate(preset);
  }

  // Stateful: valid only immediately after isValid()/save — matches the legacy contract.
  getErrors(): any {
    return this.validate.errors;
  }

  isNameUsed(name: string): boolean {
    if (this.presets) {
      return Object.keys(this.presets).filter((key) =>
        this.presets[key].name.toLowerCase() === name.toLowerCase()).length > 0;
    }
    return false;
  }
}
