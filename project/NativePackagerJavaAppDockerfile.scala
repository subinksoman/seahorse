/**
 * Copyright 2017 deepsense.ai (CodiLime, Inc)
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
import sbt.File

object NativePackagerJavaAppDockerfile {

  import sbtdocker._

  // Spark 3.4 on JDK 17 needs its full JavaModuleOptions --add-opens set; mirror the executor
  // image's JDK_JAVA_OPTIONS so the JVM services behave the same under the module system.
  private val jdk17ModuleOpts =
    "--add-opens=java.base/java.lang=ALL-UNNAMED " +
    "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED " +
    "--add-opens=java.base/java.lang.reflect=ALL-UNNAMED " +
    "--add-opens=java.base/java.io=ALL-UNNAMED " +
    "--add-opens=java.base/java.net=ALL-UNNAMED " +
    "--add-opens=java.base/java.nio=ALL-UNNAMED " +
    "--add-opens=java.base/java.util=ALL-UNNAMED " +
    "--add-opens=java.base/java.util.concurrent=ALL-UNNAMED " +
    "--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED " +
    "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED " +
    "--add-opens=java.base/sun.nio.cs=ALL-UNNAMED " +
    "--add-opens=java.base/sun.security.action=ALL-UNNAMED " +
    "--add-opens=java.base/sun.security.ssl=ALL-UNNAMED " +
    "--add-opens=java.base/sun.util.calendar=ALL-UNNAMED " +
    "--add-opens=java.security.jgss/sun.security.krb5=ALL-UNNAMED " +
    "-Dio.netty.tryReflectionSetAccessible=true"

  def apply(appDir: File, executableScriptName: String): Dockerfile = new Dockerfile()
    .from("eclipse-temurin:17-jre-alpine")
    .run("apk", "add", "--no-cache", "bash")
    .env("JDK_JAVA_OPTIONS", jdk17ModuleOpts)
    .env("JAVA_OPTS", jdk17ModuleOpts)
    .user("root")
    .workDir("/opt/docker")
    .copy(appDir, targetDir)
    .entryPoint(s"$targetDir/bin/$executableScriptName")

  private val targetDir = "app"

}
