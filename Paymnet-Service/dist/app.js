"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const mongoose_1 = require("mongoose");
const database_1 = require("./database");
const http_1 = require("http");
const helmet_1 = tslib_1.__importDefault(require("helmet"));
dotenv_1.default.config();
class App {
    constructor(routes) {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT || 3021;
        this.httpServer = (0, http_1.createServer)(this.app);
        this.app.use((0, helmet_1.default)()); // Security headers
        this.initializeMiddlewares();
        this.connectToDatabase();
        this.initializeRoutes(routes);
    }
    // Listen for incoming requests
    async listen() {
        await new Promise((resolve, reject) => {
            this.httpServer.listen(this.port, () => {
                console.log(`Server running on port ${this.port}`);
                resolve(true);
            }).on('error', (error) => {
                console.error('Port is already in use!', error);
                reject(error);
            });
        });
    }
    initializeRoutes(routes) {
        routes.forEach(route => {
            this.app.use('/api/v1', route.router); // Mounting each route
        });
        // Ping route for health check
        this.app.get('/ping', (_req, res) => { res.status(200).send('pong'); });
        // Handle undefined routes
        this.app.use('*', this.routeHandler);
    }
    initializeMiddlewares() {
        this.app.use(express_1.default.json({
            verify: (req, res, buf) => {
                req.rawBody = buf.toString();
            }
        }));
    }
    // Route handler for undefined routes
    routeHandler(_req, res, next) {
        res.status(404).json({ message: 'Route not found' });
    }
    getServer() {
        return this.app;
    }
    async connectToDatabase() {
        try {
            await (0, mongoose_1.connect)(database_1.dbConnection.url);
            console.info('Database connected successfully!');
        }
        catch (error) {
            console.error('Database connection ERROR', error);
            throw error;
        }
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map