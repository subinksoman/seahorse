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


import base64
import hashlib
from datetime import datetime

from nbformat import reads, writes, from_dict
# Jupyter Server 2: the ContentsManager base moved out of the notebook package.
from jupyter_server.services.contents.manager import ContentsManager
from tornado import web
from traitlets import Unicode, Type

from seahorse_notebook_path import SeahorseNotebookPath
from .wmcheckpoints import WMCheckpoints

from urllib.request import urlopen, Request
from urllib.error import HTTPError

NBFORMAT_VERSION = 4
DUMMY_CREATED_DATE = datetime.fromtimestamp(0)


class WMContentsManager(ContentsManager):

    KERNEL_TYPES = {
        'r': {
            'display_name': 'SparkR',
            'name': 'forwarding_kernel_r',
            'version': '3.2.3'
        },
        'python': {
            'display_name': 'PySpark',
            'name': 'forwarding_kernel_py',
            'version': '3.7.9'
        }
    }

    workflow_manager_url = Unicode(
        default_value="http://localhost:9080",
        allow_none=False,
        config=True,
        help="Workflow Manager URL",
    )

    workflow_manager_user = Unicode(
        default_value="",
        allow_none=False,
        config=True,
        help="Workflow Manager auth user",
    )

    workflow_manager_pass = Unicode(
        default_value="",
        allow_none=False,
        config=True,
        help="Workflow Manager auth pass",
    )

    # The classic `_<name>_class_default` magic method is gone; declare the trait directly.
    checkpoints_class = Type(WMCheckpoints, config=True)

    def _get_wm_notebook_url(self, path):
        return "{}/v1/workflows/{}/notebook/{}".format(
                self.workflow_manager_url, path.workflow_id, path.node_id)

    def _create_request(self, url):
        req = Request(url)
        username = self.workflow_manager_user
        password = self.workflow_manager_pass
        credentials = '%s:%s' % (username, password)
        # base64.encodestring was removed in Python 3.9; encodebytes is the replacement.
        base64string = base64.encodebytes(credentials.encode()).decode('utf-8').replace('\n', '')
        req.add_header("Authorization", "Basic %s" % base64string)
        req.add_header("X-Seahorse-UserId", "notebook")
        req.add_header("X-Seahorse-UserName", "notebook")
        return req

    def create_model(self, content_json, path, require_hash=False):
        # Report the path/name with a .ipynb extension so JupyterLab / Notebook 7 open the file
        # with the notebook widget (it selects the document factory by extension) rather than the
        # plain-text editor (which showed the raw notebook JSON). The extension is stripped again
        # by SeahorseNotebookPath.deserialize.
        serialized = path.serialize()
        # Notebook tab/header title = the Jupyter path basename. When the path carries a readable
        # display segment (SeahorseNotebookPath.display_name, sent by the frontend), the basename is
        # that name (e.g. "Python_Notebook") instead of the base64 params blob. Set the model name to
        # match the basename; fall back to a friendly language-based name for legacy 3-segment paths.
        lang_label = {"python": "Python", "r": "R"}.get(getattr(path, "language", "") or "", "")
        friendly = "{} Notebook".format(lang_label) if lang_label else "Notebook"
        base_name = getattr(path, "display_name", None) or friendly
        model = {
            "name": base_name + ".ipynb",
            "path": serialized + ".ipynb",
            "type": "notebook",
            "writable": True,
            "last_modified": DUMMY_CREATED_DATE,
            "created": DUMMY_CREATED_DATE,
            "content": reads(content_json, NBFORMAT_VERSION) if content_json is not None else None,
            "format": "json" if content_json is not None else None,
            "mimetype": None,
            "size": len(content_json.encode("utf-8")) if content_json is not None else None,
        }
        # Only include hash/hash_algorithm when a hash was actually requested and computed.
        # Jupyter Server's validate_model rejects them being present-but-None when require_hash
        # is false ("Keys unexpectedly None: ['hash', 'hash_algorithm']").
        if require_hash:
            model["hash"] = hashlib.sha256((content_json or "").encode("utf-8")).hexdigest()
            model["hash_algorithm"] = "sha256"
        return model

    def _create_notebook(self, seahorse_notebook_path):

        return {
            "cells": [],
            "metadata": {
                "kernelspec": {
                    "display_name": self.KERNEL_TYPES[seahorse_notebook_path.language]['display_name'],
                    "name": self.KERNEL_TYPES[seahorse_notebook_path.language]['name'],
                    "language": seahorse_notebook_path.language
                },
                "language_info": {
                    "name": seahorse_notebook_path.language,
                    "version": self.KERNEL_TYPES[seahorse_notebook_path.language]['version']
                }
            },
            "nbformat": NBFORMAT_VERSION,
            "nbformat_minor": 0
        }

    def _save_notebook(self, path, content_json, return_content=False):
        try:
            response = urlopen(self._create_request(self._get_wm_notebook_url(path)), content_json.encode("utf-8"))
            if response.getcode() == 201:
                return self.create_model(content_json if return_content else None, path)
            else:
                raise web.HTTPError(response.status, response.msg)
        except web.HTTPError:
            raise
        except HTTPError as e:
            raise web.HTTPError(e.code, e.reason)
        except Exception as e:
            raise web.HTTPError(500, str(e))

    def get(self, path, content=True, type=None, format=None, require_hash=False, **kwargs):
        # Jupyter Server 2.11+ passes require_hash (and may pass further kwargs); accept and
        # ignore them so the signature stays forward-compatible.
        assert isinstance(path, str)
        # The Jupyter file browser polls the root path (''/'/'); the Seahorse manager only
        # serves concrete workflow/node notebook paths, so return an empty directory model
        # for the root instead of failing SeahorseNotebookPath.deserialize with a 400.
        if path in ('', '/'):
            return {
                "name": "",
                "path": "",
                "type": "directory",
                "writable": False,
                "last_modified": DUMMY_CREATED_DATE,
                "created": DUMMY_CREATED_DATE,
                "content": [] if content else None,
                "format": "json" if content else None,
                "mimetype": None,
                "size": None,
            }
        try:
            seahorse_notebook_path = SeahorseNotebookPath.deserialize(path)
        except SeahorseNotebookPath.DeserializationFailed as e:
            raise web.HTTPError(400, str(e))

        try:
            response = urlopen(self._create_request(self._get_wm_notebook_url(seahorse_notebook_path)))
            if response.getcode() == 200:
                content_json = response.read().decode("utf-8")
                return self.create_model(content_json if content else None, seahorse_notebook_path,
                                         require_hash=require_hash)
            else:
                raise web.HTTPError(response.status, response.msg)
        except web.HTTPError:
            raise
        except HTTPError as e:
            if e.code == 404:
                content_json = writes(from_dict(
                    self._create_notebook(seahorse_notebook_path)), NBFORMAT_VERSION)
                return self._save_notebook(seahorse_notebook_path, content_json, content)
            else:
                raise web.HTTPError(e.code, e.reason)
        except Exception as e:
            raise web.HTTPError(500, str(e))

    def save(self, model, path):
        assert isinstance(path, str)
        try:
            seahorse_notebook_path = SeahorseNotebookPath.deserialize(path)
        except SeahorseNotebookPath.DeserializationFailed as e:
            raise web.HTTPError(400, str(e))

        if model['type'] != "notebook":
            model['message'] = "Cannot save object of type: {}".format(model['type'])
            return model

        content_json = writes(from_dict(model['content']), NBFORMAT_VERSION)
        return self._save_notebook(seahorse_notebook_path, content_json, False)

    def delete_file(self, path):
        raise web.HTTPError(400, "Unsupported: delete_file {}".format(path))

    def rename_file(self, old_path, path):
        raise web.HTTPError(400, "Unsupported: rename_file {} {}".format(old_path, path))

    def file_exists(self, path):
        try:
            self.get(path)
            return True
        except:
            return False

    def dir_exists(self, path):
        return False

    def is_hidden(self, path):
        return False
