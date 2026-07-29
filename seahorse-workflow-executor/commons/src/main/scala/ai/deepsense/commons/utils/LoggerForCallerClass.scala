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

package ai.deepsense.commons.utils

import org.slf4j.{Logger, LoggerFactory}

object LoggerForCallerClass {

  def apply(): Logger = {
    // We use the third stack element; second is this method, first is .getStackTrace()
    val myCaller = Thread.currentThread().getStackTrace()(2)
    // Scala 2.13 runs field initializers of a trait in `$init$` and of an `object` in the static
    // initializer `<clinit>` (2.12 used the instance `<init>`), so accept all three when this is
    // invoked from a `val logger = LoggerForCallerClass()` in a class, trait, or object.
    val method = myCaller.getMethodName()
    assert(method == "<init>" || method == "$init$" || method == "<clinit>",
      "Must be called in constructor")
    LoggerFactory.getLogger(myCaller.getClassName)
  }

}
