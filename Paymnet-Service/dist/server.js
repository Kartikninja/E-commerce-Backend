"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const payment_route_1 = require("./routes/payment.route");
const app = new app_1.App([new payment_route_1.PaymentRouter()]);
app.listen();
//# sourceMappingURL=server.js.map