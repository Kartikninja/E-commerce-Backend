"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = exports.dbConnection = void 0;
const mongoose_1 = require("mongoose");
exports.dbConnection = {
    url: "mongodb://localhost:27017/GRPC_PROJECT",
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
};
const connectToDatabase = async () => {
    if (process.env.NODE_ENV !== 'production')
        (0, mongoose_1.set)('debug', true);
    try {
        await (0, mongoose_1.connect)(exports.dbConnection.url);
        console.log('Database connection successful!');
    }
    catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
};
exports.connectToDatabase = connectToDatabase;
//# sourceMappingURL=index.js.map