import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let cachedConnection = null;

export const connectDB = async () => {
    // If we have a cached connection, return it
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            maxPoolSize: 50,
            minPoolSize: 10,
            maxIdleTimeMS: 60000,
            connectTimeoutMS: 30000,
            retryWrites: true,
            retryReads: true
        };

        // Connect to MongoDB
        const connection = await mongoose.connect(process.env.MONGO_URI, options);
        
        // Cache the connection
        cachedConnection = connection;

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            // Clear the cached connection on error
            cachedConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            // Clear the cached connection on disconnect
            cachedConnection = null;
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            cachedConnection = null;
            process.exit(0);
        });

        return connection;

    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Clear the cached connection on error
        cachedConnection = null;
        process.exit(1);
    }
};

// Export a function to get the current connection status
export const getConnectionStatus = () => {
    return {
        isConnected: mongoose.connection.readyState === 1,
        cachedConnection: !!cachedConnection
    };
};
