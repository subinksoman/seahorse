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

'use strict';

const SCHEMA = require('./preset.schema.json');
const Ajv = require('ajv');

// jsen (unmaintained, no security fix) replaced with ajv. jsen exposed validate(data) -> bool
// plus a stateful validate.errors of {path, message}, where `message` was pulled from the
// schema's custom invalidMessage/requiredMessage keywords. ajv uses a different error shape and
// ignores those custom keywords, so:
//   1) build a field -> {invalid, required} message map from the schema, and
//   2) wrap ajv's validator to re-emit errors in jsen's {path, message} shape.
// This keeps validate()/validate.errors — and the consumer (preset-modal formatErrors, which
// reads error.path / error.message) — unchanged. The schema is declared draft-04 but only uses
// keywords identical in draft-07 (type/properties/oneOf/required-array/minLength/minimum/enum),
// so the draft-04 $schema is stripped and ajv (draft-07) validates it identically.
// NOTE: ajv 6.x is used (not 8.x): ajv 8 ships ES2018+ and the legacy webpack-2 + UglifyJS-2
// (`webpack -p`) pipeline cannot minify it. ajv 6.12.6 has an ES5 dist and is security-clean
// (the ajv prototype-pollution ReDoS is fixed in >= 6.12.3). Revisit once T80 Phase B lands
// a modern minifier.
const CUSTOM_MESSAGES = (() => {
  const map = {};
  (SCHEMA.oneOf || [SCHEMA]).forEach((branch) => {
    const props = (branch && branch.properties) || {};
    Object.keys(props).forEach((field) => {
      map[field] = map[field] || {};
      if (props[field].invalidMessage) { map[field].invalid = props[field].invalidMessage; }
      if (props[field].requiredMessage) { map[field].required = props[field].requiredMessage; }
    });
  });
  return map;
})();

function buildPresetValidator() {
  const schema = Object.assign({}, SCHEMA);
  delete schema.$schema;
  const ajv = new Ajv({allErrors: true});
  const compiled = ajv.compile(schema);
  const validate = (data) => {
    const valid = compiled(data);
    validate.errors = valid ? [] : (compiled.errors || [])
      // keep field-level errors; drop the oneOf/anyOf/if/not combinator meta-errors
      .filter((e) => ['oneOf', 'anyOf', 'if', 'not'].indexOf(e.keyword) === -1)
      .map((e) => {
        // ajv 6 reports the failing location in `dataPath` (e.g. ".name"); required errors
        // carry the field in params.missingProperty.
        const path = e.keyword === 'required'
          ? e.params.missingProperty
          : (e.dataPath || '').replace(/^\./, '').replace(/\[['"]?|['"]?\]/g, '.').replace(/\.$/, '');
        const custom = CUSTOM_MESSAGES[path] || {};
        const message = e.keyword === 'required'
          ? (custom.required || e.message)
          : (custom.invalid || e.message);
        return {path, message};
      });
    return valid;
  };
  validate.errors = [];
  return validate;
}

/* @ngInject */
function PresetService(PresetsApiService, WorkflowService) {
  const validate = buildPresetValidator();
  const vm = this;

  vm.fetch = fetch;
  vm.getAll = getAll;
  vm.createPreset = createPreset;
  vm.deletePreset = deletePreset;
  vm.updatePreset = updatePreset;
  vm.savePreset = savePreset;
  vm.isNameUsed = isNameUsed;
  vm.isValid = isValid;
  vm.getErrors = getErrors;

  let presets;

  fetch();

  /**
   * @returns {Promise}
   */
  function fetch() {
    return PresetsApiService.getAll()
      .then((result) => {
        presets = result;
        return result;
      })
      .then(() => WorkflowService.fetchCluster(WorkflowService.getRootWorkflow()));
  }

  /**
   * @return {Array|undefined}
   */
  function getAll() {
    return presets;
  }

  /**
   * @param {Object} presetCandidate
   * @return {Promise}
   */
  function createPreset(presetCandidate) {
    return PresetsApiService.create(presetCandidate)
      .then(fetch);

  }

  /**
   * @param {Number} id
   * @return {Promise}
   */
  function deletePreset(id) {
    return PresetsApiService.remove(id)
      .then(fetch);
  }

  /**
   * @param {Object} presetCandidate
   * @return {Promise}
   */
  function updatePreset(presetCandidate) {
    return PresetsApiService.update(presetCandidate.id, presetCandidate)
      .then(fetch);
  }

  /**
   * @param {Object} presetCandidate
   * @return {Promise}
   */
  function savePreset(presetCandidate) {
    return presetCandidate.id ? updatePreset(presetCandidate) : createPreset(presetCandidate);
  }

  /**
   * @param {Object} preset
   * @returns {Boolean}
   */
  function isValid(preset) {
    return validate(preset);
  }

  /**
   * Gets the errors from previous validation call.
   * To be used only after (isValid, createPreset or updatePreset) because validate.errors is stateful
   * and stores information only about previous validate() call.
   * @returns {Array|undefined}
   */
  function getErrors() {
    return validate.errors;
  }

  /**
   * @param {String} name
   * @returns {Boolean}
   */
  function isNameUsed(name) {
    if (presets) {
      return Object.keys(presets).filter((key) => {
          return presets[key].name.toLowerCase() === name.toLowerCase();
        }).length > 0;
    } else {
      return false;
    }
  }
}

exports.inject = function(module) {
  module.service('PresetService', PresetService);
};
