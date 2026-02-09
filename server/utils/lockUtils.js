
import { connection as redis } from '../config/redis.js';


export async function acquireLock(key, ttl = 3600) {
    try {
        const result = await redis.set(`lock:${key}`, '1', 'EX', ttl, 'NX');
        return result === 'OK';
    } catch (error) {
        console.error(`Error acquiring lock ${key}:`, error);
        return false;
    }
}


export async function releaseLock(key) {
    try {
        const result = await redis.del(`lock:${key}`);
        return result === 1;
    } catch (error) {
        console.error(`Error releasing lock ${key}:`, error);
        return false;
    }
}


export async function isLocked(key) {
    try {
        const result = await redis.exists(`lock:${key}`);
        return result === 1;
    } catch (error) {
        console.error(`Error checking lock ${key}:`, error);
        return false;
    }
}

