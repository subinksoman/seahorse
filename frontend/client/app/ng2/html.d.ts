/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ngtemplate-loader turns an imported .html file into a templateUrl string (registered in
// $templateCache). Declare the module so migrated Angular services that open $uibModal with a
// templateUrl can `import tpl from '...html'` under TypeScript.
declare module '*.html' {
  const url: string;
  export default url;
}

// Image asset modules (webpack `type: 'asset'`) resolve to a URL string. Declared so migrated
// Angular components (e.g. the status-bar cluster icons) can `import x from 'ASSETS/images/*.png'`.
declare module '*.png' { const url: string; export default url; }
declare module '*.jpg' { const url: string; export default url; }
declare module '*.gif' { const url: string; export default url; }
declare module '*.svg' { const url: string; export default url; }
