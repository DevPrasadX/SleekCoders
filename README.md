## Stock Manager + AWS RDS

This project now talks to the `projectX` MySQL database hosted on AWS RDS. All server actions happen through the new App Router API handlers under `src/app/api/*`.

## Prerequisites

1. Node.js 20+
2. MySQL user with access to the RDS instance.
3. The stored procedures defined in `database/projectX_procedures.sql`.

## Environment variables

Create a `.env.local` file with the following keys:

```
DB_HOST=sleekcoderstockmanagement.c10iuq0iw2dx.eu-north-1.rds.amazonaws.com
DB_USER=SleekCoder
DB_PASS=Pass#123
DB_NAME=projectX
DB_PORT=3306
DEFAULT_EMPLOYEE_PASSWORD=ChangeMe123!
NEXT_PUBLIC_DEFAULT_EMPLOYEE_PASSWORD=ChangeMe123!
```

## Install & run

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## API overview

- `GET /api/employees` → list employee records
- `POST /api/employees` → create via `addEmployee`
- `PUT /api/employees` → update via `updateEmployeeDetails`
- `POST /api/auth/login` → validate credentials for any role
- `POST /api/profile/password` → tunneling via `updateEmployeePassword`
- `GET /api/products` → list products in the `PRODUCT` table
- `POST /api/products` → create via `addProductDetails`
- `GET /api/suppliers` / `POST /api/suppliers`
- `GET /api/lots` / `POST /api/lots`

Each handler shares the connection helper in `src/lib/db.ts`, which manages pooled, SSL-enabled connections to AWS RDS. Client-side screens use `src/hooks/useApiData.ts` to stay in sync with these endpoints.

## Stored procedures

The SQL script in `database/projectX_procedures.sql` drops and recreates all procedures used by the API (`addEmployee`, `updateEmployeeDetails`, `addSupplierDetails`, `addProductDetails`, `addLOTDetails`, `updateEmployeePassword`). Run the file after any schema changes to keep the procedures in sync with the application.

## User management

- Store managers can add teammates from `store-manager/users`—new accounts receive the default password from the environment variables above.
- Every authenticated user can visit `/profile` to change their password via the `updateEmployeePassword` stored procedure.
