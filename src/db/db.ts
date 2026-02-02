import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("reports.db");

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          building TEXT NOT NULL,
          floor TEXT NOT NULL,
          room_code TEXT NOT NULL,
          room_name TEXT,
          description TEXT,
          image_uri TEXT,
          created_at TEXT NOT NULL
        );
      `);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function insertReport(input: {
  building: string;
  floor: string;
  roomCode: string;
  roomName?: string;
  description?: string;
  imageUri?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.runSync(
        `INSERT INTO reports
         (building, floor, room_code, room_name, description, image_uri, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          input.building,
          input.floor,
          input.roomCode,
          input.roomName ?? "",
          input.description ?? "",
          input.imageUri ?? "",
          new Date().toISOString(),
        ]
      );
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function fetchReports(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const result = db.getAllSync(`SELECT * FROM reports ORDER BY id DESC;`);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
}

export function deleteReport(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.runSync(`DELETE FROM reports WHERE id = ?;`, [id]);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function clearAllReports(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.runSync(`DELETE FROM reports;`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
