# Copyright 2015 deepsense.ai (CodiLime, Inc)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Jupyter Server 2 config (was jupyter_notebook_config.py driving the classic NotebookApp).
# Notebook 7 / `jupyter notebook` launches a Jupyter Server, which reads THIS file and the
# ServerApp trait namespace; the old c.NotebookApp.* keys are deprecated aliases.

import os

from wmcontents import WMContentsManager

c = get_config()
c.ServerApp.open_browser = False
c.ServerApp.port = int(os.environ.get('JUPYTER_LISTENING_PORT', 8888))
c.ServerApp.ip = os.environ.get('JUPYTER_LISTENING_IP', '127.0.0.1')
# Jupyter Server 2 binds 0.0.0.0 directly; the classic '*' wildcard IP is no longer accepted.
c.ServerApp.allow_origin = '*'
c.ServerApp.base_url = '/jupyter/'
c.ServerApp.tornado_settings = {
    'headers': {
        'Content-Security-Policy': "frame-ancestors 'self' *"
    }
}

c.ServerApp.contents_manager_class = WMContentsManager
c.WMContentsManager.workflow_manager_url = os.environ.get('WM_URL', 'http://localhost:9080')
c.WMContentsManager.workflow_manager_user = os.environ.get('WM_AUTH_USER', '')
c.WMContentsManager.workflow_manager_pass = os.environ.get('WM_AUTH_PASS', '')

# Jupyter Server 2: server extensions are a {module: enabled} dict (was the removed
# NotebookApp.server_extensions list). The module exposes _jupyter_server_extension_points()
# and _load_jupyter_server_extension() (see headless_notebook_handler).
c.ServerApp.jpserver_extensions = {
    'headless_notebook_handler.headless_notebook_handler': True
}

c.Exporter.preprocessors = ['execute_saver.ExecuteSaver']
c.ClearOutputPreprocessor.enabled = True
c.ExecutePreprocessor.enabled = True
c.ExecutePreprocessor.allow_errors = True
c.ExecutePreprocessor.timeout = -1
c.SVG2PDFPreprocessor.enabled = True
c.CSSHTMLHeaderPreprocessor.enabled = True
c.LatexPreprocessor.enabled = True
c.HighlightMagicsPreprocessor.enabled = True
c.MappingKernelManager.kernel_info_timeout = 300

# The Seahorse forwarding kernel proxies messages (verbatim, same signing key) between the
# notebook server and the remote executing kernel, so the server legitimately sees repeated
# message signatures. jupyter_client 8 added strict replay-protection that raises
# "ValueError: Duplicate Signature" and drops those forwarded messages (e.g. kernel_info_reply),
# leaving the kernel stuck "connecting". Disable the digest history (size 0 => never tracked)
# to allow the forwarded messages through.
c.Session.digest_history_size = 0
