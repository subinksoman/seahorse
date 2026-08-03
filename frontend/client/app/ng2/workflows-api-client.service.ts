/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { BaseApiClient } from './base-api-client.service';

const API_TYPE = 'batch';
const PATH_WORKFLOWS = '/workflows';

// Phase C-1: migrated from common/api-clients/workflows-api-client.factory.js. Extends the Angular
// BaseApiClient; injects ServerCommunication (bridged, still AngularJS) for the STOMP-based workflow
// update. The explicit constructor forwards base deps to super(). Public surface unchanged; downgraded
// as 'WorkflowsApiClient'.
@Injectable({ providedIn: 'root' })
export class WorkflowsApiClient extends BaseApiClient {
  private ServerCommunication: any;

  constructor(
    @Inject('$http') $http: any,
    @Inject('$q') $q: any,
    @Inject('config') config: any,
    @Inject('ServerCommunication') ServerCommunication: any
  ) {
    super($http, $q, config);
    this.ServerCommunication = ServerCommunication;
  }

  getAllWorkflows(): any {
    return this.makeRequest(this.METHOD_GET, `${this.API_URL}${PATH_WORKFLOWS}`, null, 10000);
  }

  getWorkflow(workflowId: string): any {
    return this.makeRequest(this.METHOD_GET, `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}`);
  }

  createWorkflow(params: any): any {
    const data = {
      metadata: {
        type: API_TYPE,
        apiVersion: this.config.apiVersion
      },
      workflow: {
        nodes: [],
        connections: []
      },
      thirdPartyData: {
        gui: {
          name: params.name,
          description: params.description
        }
      }
    };
    return this.makeRequest(this.METHOD_POST, this.API_URL + PATH_WORKFLOWS, data);
  }

  cloneWorkflow(workflowToClone: any): any {
    return this.makeRequest(this.METHOD_POST, `${this.API_URL}${PATH_WORKFLOWS}/${workflowToClone.id}/clone`, {
      name: workflowToClone.name,
      description: workflowToClone.description
    });
  }

  deleteWorkflow(workflowId: string): any {
    return this.makeRequest(this.METHOD_DELETE, `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}`);
  }

  updateWorkflow(serializedWorkflow: any): void {
    const data: any = {
      workflowId: serializedWorkflow.id,
      workflow: _.clone(serializedWorkflow)
    };

    data.workflow.metadata = {
      type: API_TYPE,
      apiVersion: this.config.apiVersion
    };

    this.ServerCommunication.sendUpdateWorkflowToWorkflowExchange(data);
  }

  getDownloadWorkflowMethodUrl(workflowId: string, includeDatasources: boolean): string {
    return `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}/download?format=json&export-datasources=${!!includeDatasources}`;
  }

  getUploadWorkflowMethodUrl(): string {
    return `${this.API_URL}${PATH_WORKFLOWS}/upload`;
  }

  cloneNotebookNode(workflowId: string, sourceNodeId: string, destinationNodeId: string): any {
    return this.makeRequest(
      this.METHOD_POST,
      `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}/notebook/${sourceNodeId}/copy/${destinationNodeId}`
    );
  }

  getPresetByWorkflowId(workflowId: string): any {
    return this.makeRequest(
      this.METHOD_GET,
      `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}/preset`
    );
  }

  bindPresetToWorkflow(presetId: string, workflowId: string): any {
    return this.makeRequest(
      this.METHOD_POST,
      `${this.API_URL}${PATH_WORKFLOWS}/${workflowId}/preset`,
      {
        id: workflowId,
        presetId: presetId
      }
    );
  }
}
