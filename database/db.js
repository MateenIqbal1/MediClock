import * as SQLite from "expo-sqlite";

// Open the database and return a promise that resolves to the database object
const databasePromise = SQLite.openDatabaseAsync("mediclock.db");

// Helper function to get the database instance
async function getDb() {
  return await databasePromise;
}

// Initialize the database and create the medications & logs table if they don't exist
export async function initDB() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      startDate TEXT,
      time TEXT,
      reminders INTEGER,
      refill INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicationId INTEGER,
      status TEXT CHECK(status IN ('taken','missed')),
      logDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(medicationId, logDate),
      FOREIGN KEY(medicationId) REFERENCES medications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_medication_logs_date ON medication_logs(logDate);

    CREATE TABLE IF NOT EXISTS notifications_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicationId INTEGER,
      medicationName TEXT,
      dosage TEXT,
      title TEXT,
      body TEXT,
      notificationTime TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(medicationId) REFERENCES medications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_history_time ON notifications_history(notificationTime);
  `);
  
  // Migration: Add dosage column if it doesn't exist
  try {
    await db.execAsync(`
      ALTER TABLE notifications_history ADD COLUMN dosage TEXT;
    `);
    console.log("Migration: Added dosage column to notifications_history");
  } catch (err) {
    // Column already exists or table already has it
    if (!err.message?.includes('duplicate column')) {
      console.warn("Migration warning:", err.message);
    }
  }
  
  console.log("Database initialized.");
}

// Insert a new medication into the database
export async function insertMedication(data) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO medications 
      (name, dosage, frequency, duration, startDate, time, reminders, refill, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.dosage,
      data.frequency,
      data.duration,
      data.startDate,
      data.time,
      data.reminders ? 1 : 0,
      data.refill ? 1 : 0,
      data.notes,
    ]
  );
  console.log("Saved!", result);
  return result.lastInsertRowId;
}

// Retrieve all medications from the database
export async function getAllMedications() {
  const db = await getDb();
  const allRows = await db.getAllAsync(`SELECT * FROM medications`);
  console.log("ALL MEDICATIONS →", allRows);
  return allRows;
}

function formatDateKey(dateLike) {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Insert or update a log for a medication on a specific day
export async function logMedicationStatus(medicationId, status, logDate = new Date()) {
  if (!medicationId || !status) return null;
  const db = await getDb();
  const dateKey = formatDateKey(logDate);
  await db.runAsync(
    `INSERT OR REPLACE INTO medication_logs (medicationId, status, logDate)
     VALUES (?, ?, ?)`
  , [medicationId, status, dateKey]);
  return { medicationId, status, logDate: dateKey };
}

// Fetch logs for a specific day (ISO date string YYYY-MM-DD)
export async function getLogsByDate(dateKey) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT l.*, m.name, m.dosage, m.time
     FROM medication_logs l
     JOIN medications m ON m.id = l.medicationId
     WHERE l.logDate = ?
     ORDER BY m.time ASC`
  , [dateKey]);
}

// Fetch all logs with medication details, newest first
export async function getHistoryLogs() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT l.*, m.name, m.dosage, m.time
     FROM medication_logs l
     JOIN medications m ON m.id = l.medicationId
     ORDER BY l.logDate DESC, m.time ASC`
  );
}

// Update medication status (used by notification responses)
export async function updateMedicationStatus(medicationId, status) {
  return logMedicationStatus(medicationId, status);
}

// Danger: clears all medication data and logs
export async function clearAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM medication_logs;
    DELETE FROM medications;
    DELETE FROM notifications_history;
  `);
}

// Insert notification history entry
export async function insertNotificationHistory(data) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO notifications_history (medicationId, medicationName, dosage, title, body, notificationTime)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.medicationId, data.medicationName, data.dosage || '', data.title, data.body, data.notificationTime]
  );
}

// Get all notifications history, newest first
export async function getNotificationsHistory() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM notifications_history ORDER BY notificationTime DESC`
  );
}

// Get count of unread/all notifications
export async function getNotificationsCount() {
  const db = await getDb();
  const result = await db.getFirstAsync(`SELECT COUNT(*) as count FROM notifications_history`);
  return result?.count || 0;
}

// Delete a single notification
export async function deleteNotification(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notifications_history WHERE id = ?`, [id]);
}

// Clear all notifications history
export async function clearAllNotifications() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notifications_history`);
}
