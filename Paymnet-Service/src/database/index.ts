import { connect, set } from "mongoose";
import { config } from 'dotenv'
config()
export const dbConnection = {
    url: process.env.DB_URL,
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
};


export const connectToDatabase = async () => {
    if (process.env.NODE_ENV !== 'production') set('debug', true);

    try {
        await connect(dbConnection.url);
        console.log('Database connection successful!');
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
};