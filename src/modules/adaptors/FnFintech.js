import FnAdaptorConfig from "./config";

class FnFintech {
    #fintect = null;
    constructor() {
        if (FnFintech.instance) {
            return FnFintech.instance;
        }
        if (FnAdaptorConfig.fintect.provider === 'stripe') {
            // Dynamically import the FnStripe module
            this.#fintect = import('../fintevh/stripe.js');
        }
        FnFintech.instance = this;
    }
    static getInstance() {
        if (!FnFintech.instance) {
            FnFintech.instance = new FnFintech();
        }
        return FnFintech.instance;
    }
}