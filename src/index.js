/*
// The "barrel file" for your library.
import { capitalize, reverseString } from './modules/utils.js';

// Export your modules and functions for public use.
export {
  capitalize,
  reverseString,
};

// You can also export a default object if preferred.
// export default {
//   capitalize,
//   reverseString,
// };

*/
import FnCacheAdaptor from './modules/adaptors/FnCache.js';
const FnCache = FnCacheAdaptor();
export {FnCache};