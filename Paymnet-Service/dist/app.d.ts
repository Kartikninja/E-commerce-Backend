import express from 'express';
import { Server as HTTPServer } from 'http';
import { Routes } from './interface/routes.interface';
export declare class App {
    app: express.Application;
    port: string | number;
    httpServer: HTTPServer;
    constructor(routes: Routes[]);
    listen(): Promise<void>;
    private initializeRoutes;
    private initializeMiddlewares;
    private routeHandler;
    getServer(): express.Application;
    private connectToDatabase;
}
