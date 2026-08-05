/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const Stomp: any; // stompjs (global)

// Phase C / AngularJS removal (engine cluster): native port of server-communication/server-communication.js
// — the STOMP-over-WebSocket client to RabbitMQ (subscribe to the workflow/seahorse exchanges, rebroadcast
// messages on $rootScope, send launch/abort/update/synchronize, reconnect). Deps ($log/$q/$timeout/
// $rootScope/config) are bridged AngularJS core. Consumed by 5 ng2 services (aliased to the class) AND the
// still-AngularJS loading-mask (index.html), so also downgraded as 'ServerCommunication' in bootstrap.ts.
// Stomp is a global; native WebSocket. Logic ported verbatim (incl. the RabbitMQ-4 raw-WS + heartbeat notes).

const _messages = ['executionStatus', 'inferredState', 'ready', 'terminated', 'heartbeat'];

@Injectable({ providedIn: 'root' })
export class ServerCommunicationService {
  // Native connection-status stream (true = connected). Replaces the $rootScope broadcast for the ng2
  // loading-mask (the only listener) — sidesteps AngularJS scope propagation to downgraded components.
  readonly connectionStatus$ = new BehaviorSubject<boolean>(true);
  private connectionAttemptId = Math.floor(Math.random() * 1000000);
  private exchangeSubscriptions: { [uri: string]: any } = {};
  private workflowId: string;
  private client: any;
  private socket: any;

  constructor(
    @Inject('$q') private $q: any,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('config') private config: any
  ) {}

  private seahorseTopicListeningUri(): string {
    return `/exchange/seahorse/seahorse.${this.workflowId}.to`;
  }
  private workflowTopicListeningUri(): string {
    return `/exchange/seahorse/workflow.${this.workflowId}.${this.workflowId}.to`;
  }
  private workflowTopicSendingUri(): string {
    return `/exchange/seahorse/workflow.${this.workflowId}.${this.workflowId}.from`;
  }

  static isMessageKnown(msgType: string): boolean {
    return _messages.indexOf(msgType) !== -1;
  }

  messageHandler(uri: string, message: any): void {
    const parsedBody = JSON.parse(message.body);
    if (!ServerCommunicationService.isMessageKnown(parsedBody.messageType)) {
      console.error('ServerCommunication messageHandler. Unknown message type "' + parsedBody.messageType + '"');
      return;
    }
    this.$rootScope.$broadcast(`ServerCommunication.MESSAGE.${parsedBody.messageType}`, parsedBody.messageBody);
  }

  errorHandler(connectionAttemptId: number, error: any): void {
    if (connectionAttemptId !== this.connectionAttemptId) {
      console.info('ServerCommunication onWebSocketConnectError. Ignoring old error.');
      return;
    }
    console.info('ServerCommunication onWebSocketConnectError. Error: ', error);
    console.error('An error has occurred: ', error);
    this.$rootScope.$broadcast('ServerCommunication.CONNECTION_LOST');
    this.connectionStatus$.next(false);
    this.client = this.socket = null;
    this.reconnect();
  }

  reconnect(): void {
    console.info('ServerCommunication reconnect');
    setTimeout(() => { this._connectToWebSocket(); }, this.config.socketReconnectionInterval);
  }

  sendSynchronize(): void {
    this.send(this.workflowTopicSendingUri(), {}, JSON.stringify({ messageType: 'synchronize', messageBody: {} }));
  }

  send(uri: string, headers: any = {}, message: any = {}): any {
    console.info('ServerCommunication send, uri ', uri);
    return this.client.send(uri, headers, message);
  }

  sendLaunchToWorkflowExchange(nodesToExecute: any): void {
    this.send(this.workflowTopicSendingUri(), {}, JSON.stringify({
      messageType: 'launch',
      messageBody: { workflowId: this.workflowId, nodesToExecute }
    }));
  }

  sendAbortToWorkflowExchange(): void {
    this.send(this.workflowTopicSendingUri(), {}, JSON.stringify({
      messageType: 'abort',
      messageBody: { workflowId: this.workflowId }
    }));
  }

  sendUpdateWorkflowToWorkflowExchange(data: any): void {
    console.info('ServerCommunication updateWorkflow');
    this.send(this.workflowTopicSendingUri(), {}, JSON.stringify({ messageType: 'updateWorkflow', messageBody: data }));
  }

  private _subscribeToExchange(uri: string): void {
    const previousSubscription = this.exchangeSubscriptions[uri];
    if (previousSubscription) { previousSubscription.unsubscribe(); }
    const newSubscription = this.client.subscribe(uri, this.messageHandler.bind(this, uri));
    this.exchangeSubscriptions[uri] = newSubscription;
    console.info('Subscribe to exchange ' + uri + ', subscription: ', newSubscription);
  }

  unsubscribeFromAllExchanges(): void {
    for (const key in this.exchangeSubscriptions) {
      if (this.exchangeSubscriptions.hasOwnProperty(key)) {
        this.exchangeSubscriptions[key].unsubscribe();
      }
    }
    this.exchangeSubscriptions = {};
  }

  private _onWebSocketConnect(): void {
    console.info('ServerCommunication onWebSocketConnect');
    this._subscribeToExchange(this.seahorseTopicListeningUri());
    this._subscribeToExchange(this.workflowTopicListeningUri());
    this.$rootScope.$broadcast('ServerCommunication.CONNECTION_ESTABLISHED');
    this.connectionStatus$.next(true);
  }

  private _connectToWebSocket(user: string = `${this.config.mqUser}`, pass: string = `${this.config.mqPass}`): void {
    // Raw WebSocket to /stomp (http->ws, https->wss); RabbitMQ 4.x serves web-stomp there.
    const wsUrl = `${this.config.socketConnectionHost.replace(/^http/, 'ws')}stomp`;
    this.socket = new WebSocket(wsUrl);
    this.client = Stomp.over(this.socket);
    this.client.debug = null; // silence stompjs per-frame console flood
    this.client.heartbeat = { incoming: 0, outgoing: 20000 }; // 20s keepalive (RabbitMQ closes idle ~60s)
    this.connectionAttemptId = Math.floor(Math.random() * 1000000);
    this.client.connect(
      user, pass,
      this._onWebSocketConnect.bind(this),
      this.errorHandler.bind(this, this.connectionAttemptId)
    );
  }

  init(workflowId: string): void {
    console.log('ServerCommunication init', 'Server communication initialized with workflow id ' + workflowId);
    this.workflowId = workflowId; // TODO There should be no state here.
    this._connectToWebSocket();
  }
}
