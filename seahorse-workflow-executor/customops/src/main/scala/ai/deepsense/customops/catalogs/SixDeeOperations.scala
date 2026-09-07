/**
 * Copyright 2026 6D Technologies
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

package ai.deepsense.customops.catalogs

import ai.deepsense.deeplang.catalogs.SortPriority
import ai.deepsense.deeplang.catalogs.doperations.DOperationCategory
import ai.deepsense.deeplang.catalogs.spi.{CatalogRegistrant, CatalogRegistrar}
import ai.deepsense.customops.doperations._
import ai.deepsense.customops.doperables.MlflowModel

/**
 * Own palette category for these operations.
 *
 * The `@Register` annotation is the other way into the catalog, but `CatalogScanner` hardcodes
 * `DOperationCategories.UserDefined` for everything it finds, so a category of our own needs this
 * SPI instead — declared in `META-INF/services/ai.deepsense.deeplang.catalogs.spi.CatalogRegistrant`
 * and loaded by `CatalogRecorder`. The operations must therefore NOT also carry `@Register`:
 * `DOperationsCatalog.registerDOperation` throws on a duplicate id, which would take down the
 * whole catalog.
 *
 * `sdkDefault` sorts after every core category, so SixDee sits at the bottom of the palette.
 */
object SixDeeCategory extends DOperationCategory(
  id = "5f9a2e14-6c3b-4d87-9a51-7e0b8c4d2f36",
  name = "sixdee",
  priority = SortPriority.sdkDefault)

class SixDeeOperations extends CatalogRegistrant {
  override def register(registrar: CatalogRegistrar): Unit = {
    // MlflowModel is a port type, so it must be in the operable catalog too: that is what the
    // editor consults to decide which outputs may connect to which inputs.
    registrar.registerOperable[MlflowModel]()

    val priority = SortPriority.sdkInSequence
    registrar.registerOperation(
      SixDeeCategory, () => new PythonTransformation1To2(), priority.next())
    registrar.registerOperation(
      SixDeeCategory, () => new PythonTransformation2To1(), priority.next())
    registrar.registerOperation(
      SixDeeCategory, () => new PythonTransformation2To2(), priority.next())
    registrar.registerOperation(
      SixDeeCategory, () => new PushToMlflow(), priority.next())
    registrar.registerOperation(
      SixDeeCategory, () => new MlflowPredict(), priority.next())
  }
}
