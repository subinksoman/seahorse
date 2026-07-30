import com.typesafe.sbt.SbtGit
import scala.sys.process._

enablePlugins(sbtdocker.DockerPlugin, JavaAppPackaging)

lazy val workflowExecutorProject = ProjectRef(file("./seahorse-workflow-executor"), "workflowexecutor")
lazy val assembly = taskKey[File]("Copied from sbt-assembly's keys.")
lazy val weJar = taskKey[File]("Workflow executor runnable jar")
weJar := (assembly in workflowExecutorProject).value

lazy val pythonAndRDeps = taskKey[File]("Generates we_deps.zip file with python and R dependencies")
pythonAndRDeps := {
  Process(Seq("sessionmanager/prepare-deps.sh", Version.spark)).!!
  target.value / "we-deps.zip"
}
pythonAndRDeps := (pythonAndRDeps dependsOn weJar).value

dockerBaseImage :=
  s"seahorse-spark:${SbtGit.GitKeys.gitHeadCommit.value.get}"

lazy val tiniVersion = "v0.10.0"

imageNames in docker := Seq(ImageName(s"seahorse-sessionmanager:${SbtGit.GitKeys.gitHeadCommit.value.get}"))

dockerfile in docker := {
  val sessionManagerAppDir = stage.value

  new Dockerfile {
    from(dockerBaseImage.value)

    user("root")
    workDir("/opt/docker")

    runRaw("/opt/conda/bin/pip install pika==1.3.2")
    runRaw("/opt/conda/bin/pip install py4j")
    runRaw("/opt/conda/bin/pip install mlxtend==0.22.0")
    runRaw("/opt/conda/bin/pip install scikit-learn")
    // reportlab==3.6.5 has no cp312 wheel and its C extension fails to compile on Python 3.12
    // (PyFrameObject became opaque in the 3.11+ C API). The seahorse-spark base already
    // installs a cp312 reportlab via requirements.txt, so leave it unpinned (already satisfied).
    runRaw("/opt/conda/bin/pip install reportlab")
    /*runRaw(
      """/opt/conda/bin/pip install --no-cache-dir \
         pika==1.3.2 \
         py4j \
         mlxtend==0.22.0 \
         scikit-learn \
         reportlab==3.6.5"""
    )*/


    // Add Tini - so the python zombies can be collected
    env("TINI_VERSION", tiniVersion)
    addRaw(s"https://github.com/krallin/tini/releases/download/$tiniVersion/tini", "/bin/tini")
    runRaw("chmod +x /bin/tini")
    
    // Full Spark 3.4 JDK-17 --add-opens set (matches the seahorse-spark base and the native
    // -packager services); the previous 4-opens subset was insufficient for Spark 3.4 reflection.
    val jdk17ModuleOpts =
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
      // The workflow-executor reflects into sun.security.ssl.SSLSocketFactoryImpl
      // (Executor.createExecutionContext) when setting up its HTTPS client on JDK 17.
      "--add-opens=java.base/sun.security.ssl=ALL-UNNAMED " +
      "--add-opens=java.base/sun.util.calendar=ALL-UNNAMED " +
      "--add-opens=java.security.jgss/sun.security.krb5=ALL-UNNAMED " +
      "-Dio.netty.tryReflectionSetAccessible=true"
    env("JDK_JAVA_OPTIONS", jdk17ModuleOpts)
    env("JAVA_OPTS", jdk17ModuleOpts)



    copy(pythonAndRDeps.value, "we-deps.zip")
    copy(weJar.value, "we.jar")
    //copy("/data/seahorse/mimepull-1.9.13.jar", "/opt/docker/app/lib/mimepull-1.9.13.jar")
    //copy(new File("sessionmanager/extra-lib/mimepull-1.9.13.jar"),"/opt/docker/app/lib/mimepull-1.9.13.jar")
    copy(sessionManagerAppDir, "app")

    entryPoint("/bin/tini", "--")
    cmd("app/bin/seahorse-sessionmanager")
  }
}
