import mysql, { PoolConnection, ResultSetHeader } from 'mysql2/promise';

type QueryResult<T> = [T, mysql.FieldPacket[]];

let pool: mysql.Pool | null = null;

const requiredEnvVars: Array<keyof NodeJS.ProcessEnv> = [
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
];

function ensureEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}`,
    );
  }
}

function getPool() {
  if (!pool) {
    ensureEnv();
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return pool;
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const connection = await getConnection();
  try {
    return await connection.query<T>(sql, params);
  } finally {
    connection.release();
  }
}

export async function callProcedure<T = mysql.RowDataPacket[]>(
  name: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const placeholders = params.length ? params.map(() => '?').join(',') : '';
  const sql = params.length ? `CALL ${name}(${placeholders})` : `CALL ${name}()`;
  return query<T>(sql, params);
}

export type ExecResult = ResultSetHeader;

