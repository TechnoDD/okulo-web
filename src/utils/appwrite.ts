import {
  Client,
  Account,
  ID,
  Models,
  Storage,
  Query,
  Permission,
  Role,
  TablesDB,
} from "appwrite";

export const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);
export const tablesDB = new TablesDB(client);
export { ID, Query, Permission, Role };
export type { Models };
