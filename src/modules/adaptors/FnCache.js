
import fnConfig from './config.js';


class FnCache {
    #cache = null;
    constructor() {
        if (FnCache.instance) {
            return FnCache.instance;
        }
        if (fnConfig.cache === 'redis') {
            // Dynamically import the FnRedis module
            this.#cache = import('../database/FnRedis.js');
        }

        FnRedis.instance = this;
    }
    static getInstance() {
        if (!FnCache.instance) {
            FnCache.instance = new FnCache();
        }
        return FnCache.instance;
    }


    async getValue({key, bypass = false}){
        const response = await this.#cache.getWithKey({key, bypass});
        return response;
    }
    setValue({key, value}){
        const response = this.#cache.setWithKey({key, value});
        return response;
    }
}
const FnCacheInstance = FnCache.getInstance();
export default FnCacheInstance;
export {FnCacheInstance};

