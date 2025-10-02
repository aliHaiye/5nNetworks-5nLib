import Redis from 'ioredis';

class FnRedis {
    #cluster;
    constructor() {
        if (FnRedis.instance) {
            return FnRedis.instance;
        }
        this.#cluster = new Redis.Cluster([{
            "host": "127.0.0.1",
            "port": 6379
        }]);
        FnRedis.instance = this;
    }
    static getInstance() {
        if (!FnRedis.instance) {
            FnRedis.instance = new FnRedis();
        }
        return FnRedis.instance;
    }


    async getWithKey({
        key
    }) {
        try {
            const key = `FnRedis||${key}`;
            let response = {
                cache: "MISS",
                error: {},
                data: {}
            };
            if ((await this.#cluster.exists(key)) === 1) {
                response.cache = "HIT";
                response.data = JSON.parse(await this.#cluster.get(key));
                return response;
            } else {
                response.cache = "MISS";
                response.error = {
                    message: "Key not found"
                };
            }
        } catch (err) {
            return {
                cache: "MISS",
                error: {
                    message: err.message,
                    stack: err.stack
                },
                data: {}
            };
        }
    }

    setWithKey({key, value}) {
        try {
            const key = `FnRedis||${key}`;
            this.#cluster.set(key, JSON.stringify(value));
            return {
                success: true,
                error: {}
            };
        } catch (err) {
            return {
                success: false,
                error: {
                    message: err.message,
                    stack: err.stack
                }
            };
        }
    }
}

const FnRedisInstance = FnRedis().getInstance();
export default FnRedisInstance
export {
    FnRedisInstance
};