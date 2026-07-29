/**
 * Copyright 2016 deepsense.ai (CodiLime, Inc)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package ai.deepsense.workflowexecutor.pythongateway

import java.net.InetAddress

import py4j.{CallbackClient, GatewayServer}

object GatewayServerFactory {

  /**
   * GatewayServer is missing an appropriate constructor.
   * We have to use reflection to set it's private final fields to correct values.
   */
  def create(
      entryPoint: Object,
      port: Int,
      connectTimeout: Int,
      readTimeout: Int,
      cbClient: CallbackClient,
      hostAddress: InetAddress): GatewayServer = {
    // py4j 0.10.9.x (bundled with Spark 3.4.4) provides a full constructor that wires the port,
    // timeouts, bind address, callback client, and internal Gateway (with the GATEWAY_SERVER_ID
    // binding, pythonPort/pythonAddress and listeners). The previous version reflectively set
    // GatewayServer's private final fields, which required stripping `final` via the
    // Field.modifiers hack that the JDK removed in 12+ (NoSuchFieldException: modifiers). Using
    // the constructor removes the reflection entirely.
    new GatewayServer(
      entryPoint,
      port,
      hostAddress,
      connectTimeout,
      readTimeout,
      null /* customCommands */,
      cbClient)
  }
}
