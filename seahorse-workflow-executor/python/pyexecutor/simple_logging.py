# Copyright 2017 deepsense.ai (CodiLime, Inc)
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

from __future__ import print_function

import os
import sys

# Level-gated logging for the PyExecutor. The level is read from the LOG_LEVEL env var
# (DEBUG/INFO/WARN/ERROR), default INFO — so DEBUG output is hidden unless explicitly enabled.
# Non-error levels go to STDOUT; only ERROR goes to STDERR. This matters because the JVM
# PythonExecutionCaretaker captures the executor's STDERR and logs it at ERROR level — previously
# every raw `print('DEBUG: ...', file=sys.stderr)` showed up as a fake ERROR in the service logs.
_LEVELS = {'DEBUG': 10, 'INFO': 20, 'WARN': 30, 'WARNING': 30, 'ERROR': 40}
_threshold = _LEVELS.get(os.environ.get('LOG_LEVEL', 'INFO').upper(), 20)


def _emit(level_name, level_value, stream, s):
    if level_value >= _threshold:
        print('[PyExecutor {}] {}'.format(level_name, s), file=stream)
        stream.flush()


def log_debug(s):
    _emit('DEBUG', 10, sys.stdout, s)


def log_info(s):
    _emit('INFO', 20, sys.stdout, s)


def log_warn(s):
    _emit('WARN', 30, sys.stdout, s)


def log_error(s):
    _emit('ERROR', 40, sys.stderr, s)
