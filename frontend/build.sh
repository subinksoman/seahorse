#!/bin/bash -ex

# Copyright 2016 deepsense.ai (CodiLime, Inc)
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


function prepare_environment() {
  # npm 7+ (Node 22) enforces peerDependencies strictly; this legacy tree pins
  # several webpack-1-era dev tools (extract-text-webpack-plugin, karma-webpack,
  # webpack-dev-server@1) that declare a webpack ^1 peer while the build runs on
  # webpack 2. --legacy-peer-deps restores the npm 4-6 resolution the lockfile
  # was created with. None of those webpack-1-only tools are used by `npm run dist`.
  npm install --legacy-peer-deps
}

function build() {
  echo "** Building package **"
  npm run dist
}

prepare_environment
build
