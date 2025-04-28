import 'reflect-metadata';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import { connect, set } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { NODE_ENV, PORT, LOG_FORMAT, REDIS_HOST, REDIS_PORT } from '@config';
import { dbConnection } from '@database';
import { Routes } from '@interfaces/routes.interface';
import { createServer, Server as HTTPServer } from 'http';
import { Logger } from './utils/logger';
import { ErrorMiddleware } from './middlewares/error.middleware';
import Redis, { Redis as RedisClient } from 'ioredis'
import { cron1 } from './utils/corn/node-corn';
import { initializeSocket } from './utils/socket/socket';
import { Server } from 'socket.io';
import { initializePayoutWorker, initializeShippingWorker } from './workers/payout.worker';


import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { payoutQueue, shippingQueue } from './workers/Queue';

export class App {
  // private initializeErrorHandling() {
  //   this.app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  //     console.error(`Unhandled Rejection at: ${req.url}, ${err}`);
  //     console.error(err instanceof Error ? err.stack : String(err));
  //     res.status(500).json({
  //       error: 'Internal Server Error',
  //       message: err instanceof Error ? err.message : String(err),
  //     });
  //   });
  // }
  public app: express.Application;
  public env: string;
  public port: string | number;
  public server: any;
  public http: any;
  public httpServer: HTTPServer;
  private redisClient: RedisClient | null = null;
  private io: Server;



  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3020;
    this.app.set('port', this.port);
    this.httpServer = createServer(this.app);
    this.http = require('http').Server(this.app);
    this.app.use(helmet());
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeErrorHandling();
    this.initializeSocket();

    this.initializeRedis()
    this.initializeCron()


    this.initializeBullMQWorker();


    this.initializeBullBoard()
    this.initializeRoutes(routes);

  }



  private async initializeBullMQWorker() {

    initializePayoutWorker()
    // initializeRefundWorker()
    initializeShippingWorker()
  }


  private async initializeBullBoard() {
    console.log("Initializing Bull Board...");

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');


    createBullBoard({
      queues: [new BullMQAdapter(payoutQueue), new BullMQAdapter(shippingQueue)],
      serverAdapter,
    });
    this.app._router.stack.forEach(layer => {
      if (layer.route) {
        console.log("_router", layer.route.path);
      }
    });

    this.app.use('/admin/queues', serverAdapter.getRouter());

    console.log("Bull Board initialized at: http://localhost:" + this.port + "/admin/queues");
  }

  public async listen() {
    await new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        console.log(`==========================================`);
        console.log(`========== ENV: ${this.env} ==============`);
        Logger.info(`=== 🚀 App listening on the port ${this.port} ===`);
        console.log(`==========================================`);
        resolve(true);
      }).on('error', (error) => {
        Logger.error('Port is already in use!', error);
        reject(error);
      });
    })

  }
  private async initializeCron() {
    console.log("Cron job initialized");

    await cron1
  }


  private async initializeSocket() {

    await initializeSocket(this.httpServer)

  }



  private initializeRedis() {
    this.redisClient = new Redis({
      host: REDIS_HOST,
      port: Number(REDIS_PORT),

    })
    this.redisClient.on('connect', () => {
      Logger.info("Redis connected successfully")
    })
    this.redisClient.on('error', (err) => {
      Logger.error('Redis connection error:', err);

    })
  }

  public getServer() {
    return this.app;
  }

  private async connectToDatabase() {
    if (this.env !== 'production') set('debug', true);

    try {
      await connect(dbConnection.url);
      Logger.info('Database connection successfully!!!');
    } catch (error) {
      Logger.error(`Database connection ERROR`, error);
      throw error;
    }
  }

  private initializeMiddlewares() {

    this.app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
    // this.app.use(express.json());
    this.app.use(express.json({
      verify: (req, res, buf) => {
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(hpp());
    this.app.use(compression());
    this.app.use(cookieParser());
    this.app.disable('x-powered-by');


  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/api/v1', route.router);
    });

    this.app.get('/ping', (_req, res) => {
      return res.status(200).send('pong');
    });
    this.app.use('*', this.routHandler);
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    this.app.get('/ping', (req, res) => {
      return res.status(200).send('pong');
    });
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }

  private routHandler(_req: Request, res: Response) {
    res.status(404).json({ message: 'Route not found' });
  }

}
