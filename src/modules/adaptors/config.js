const FnAdaptorConfig = {
    "cache": 'redis',
    "database": 'firestore',
    "fintect": {
        "provider":"stripe",
        "publicKey":"pk_test_51SDBtDHBaXygfJMcqjhrhlApWtfqlvVtKmfyfYkFnte2pK5rEFsOgC35Rd6rTiBohlYiwmmhgC9no0TjGGfNTsMy00o97ToItX",
        "secretKey":"sk_test_51SDBtDHBaXygfJMcJelSUHjTOSVm9soV5cFud9Hjgx2ySU9pEFMp5i61yuHo1XuKSJcdAdasRpTUWjEcurBsnadv00lDAOlQZN"
    }
}

export default FnAdaptorConfig;
export {
    FnAdaptorConfig
};