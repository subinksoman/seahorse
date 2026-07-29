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

package org.scalatra

/**
 * Compatibility shim. Scalatra 2.7 removed `org.scalatra.TypedParamSupport` (its typed-parameter
 * functionality was folded into `ScalatraBase`), but the `scalatra-swagger-codegen` plugin still
 * emits `import org.scalatra.{ TypedParamSupport, ScalatraServlet }` into generated servlets.
 * The generated code only imports the name (it is not mixed in and none of its members are used),
 * so an empty marker trait is enough to keep the generated import resolving on Scala 2.13.
 */
trait TypedParamSupport
