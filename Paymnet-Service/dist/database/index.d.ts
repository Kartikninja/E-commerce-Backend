export declare const dbConnection: {
    url: string;
    options: {
        useNewUrlParser: boolean;
        useUnifiedTopology: boolean;
    };
};
export declare const connectToDatabase: () => Promise<void>;
