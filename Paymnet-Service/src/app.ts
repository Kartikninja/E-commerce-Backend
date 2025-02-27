// src/app.ts (Payment Server)
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { connect } from 'mongoose';
import { dbConnection } from './database';
import { Routes } from './interface/routes.interface';
import helmet from 'helmet';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { PaymentController } from './controller/payment.controller';
import fs from 'fs';
import cors from 'cors';
import https from 'https';
import bodyParser from 'body-parser';
dotenv.config();

const PROTO_PATH = path.resolve(__dirname, './proto/payment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const paymentProto = grpcObject.payment;

export class App {
    public app: express.Application;
    public port: string | number;
    public httpServer: any;
    private grpcServer: grpc.Server;

    constructor(routes: Routes[]) {
        this.app = express();
        this.port = process.env.PORT || 3021;
        this.grpcServer = new grpc.Server();
        this.app.use(helmet());
        this.app.use(cors());

        // Use HTTPS with SSL certificates
        const privateKey = fs.readFileSync(path.resolve(__dirname, './openSsl/private.key'), 'utf8');
        const certificate = fs.readFileSync(path.resolve(__dirname, './openSsl/certificate.crt'), 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        this.httpServer = https.createServer(credentials, this.app); // Replace http2 with https

        this.initializeMiddlewares();
        this.connectToDatabase();
        this.initializeRoutes(routes);
        this.initializeGrpcServer();

        // Start the HTTP server
        this.listenHttpServer();
    }

    private async listenHttpServer() {
        this.httpServer.listen(this.port, () => {
            console.log(`HTTPS server running on port ${this.port}`);
        });
    }

    public async listen(): Promise<void> {
        await new Promise((resolve, reject) => {
            this.grpcServer.bindAsync(
                `0.0.0.0:50052`,
                grpc.ServerCredentials.createInsecure(),
                (error, port) => {
                    if (error) {
                        console.error('Error binding gRPC server:', error);
                        reject(error);
                    }
                    console.log(`gRPC server running on port ${port}`);
                    this.grpcServer.start();
                    resolve(true);
                }
            );
        });
    }

    private initializeGrpcServer(): void {
        this.grpcServer.addService(paymentProto.PaymentService.service, {
            CreateRazorpayOrder: new PaymentController().createRazorpayOrder,
            CancelOrder: new PaymentController().CancelOrder,
            CreateSubscriptionPlan: new PaymentController().createSubscriptionPlan,
            CancelSubscription: new PaymentController().cancelUserSubscription
        });
    }

    private initializeRoutes(routes: Routes[]): void {
        routes.forEach(route => {
            this.app.use('/api/v1', route.router);
        });

        this.app.get('/ping', (_req, res) => {
            console.log("hit");
            res.status(200).send('Hello, world!');
        });

        this.app.post('/webhook', (req, res) => {
            new PaymentController().verifyWebhook(req, res);
        });

        this.app.use('*', this.routeHandler);
    }

    private initializeMiddlewares(): void {
        // this.app.use(express.json({
        //     verify: (req, res, buf) => {
        //         (req as any).rawBody = buf;
        //     }
        // }));
        this.app.use(bodyParser.json({
            verify: (req, res, buf) => {
                (req as any).rawBody = buf;
            },
        }));
    }

    private routeHandler(_req: Request, res: Response, _next: NextFunction): void {
        res.status(404).json({ message: 'Route not found' });
    }

    public getServer(): express.Application {
        return this.app;
    }

    private async connectToDatabase(): Promise<void> {
        try {
            await connect(dbConnection.url);
            console.info('Database connected successfully!');
        } catch (error) {
            console.error('Database connection ERROR', error);
            throw error;
        }
    }
}