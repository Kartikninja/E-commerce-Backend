import { App } from './app'
import { PaymentRouter } from './routes/payment.route'


const app = new App([new PaymentRouter()])
app.listen()