import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 1. Baca konfigurasi dari file .env
dotenv.config();

// 2. Tentukan konfigurasi SSL untuk Cloud DB (TiDB Serverless / Managed Cloud MySQL)
const isCloudHost = process.env.DB_HOST && !['localhost', '127.0.0.1', 'mysql'].includes(process.env.DB_HOST);
const isSslEnabled = process.env.DB_SSL === 'true' || isCloudHost;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo_db',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ...(isSslEnabled ? {
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
    } : {})
});

// 3. Export agar bisa dipakai di tempat lain
export default pool;
