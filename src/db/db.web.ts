type Report = {
id: number;
building: string;
floor: string;
room_code: string;
room_name: string;
description: string;
image_uri: string;
created_at: string;
};

const STORAGE_KEY = "fault-report-mvp-reports";

function getStoredReports(): Report[] {
if (typeof localStorage === "undefined") return [];

try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return [];
return JSON.parse(raw) as Report[];
} catch {
return [];
}
}

function saveStoredReports(reports: Report[]) {
if (typeof localStorage === "undefined") return;
localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function initDb(): Promise<void> {
return Promise.resolve();
}

export function insertReport(input: {
building: string;
floor: string;
roomCode: string;
roomName?: string;
description?: string;
imageUri?: string;
}): Promise<void> {
const reports = getStoredReports();

const newReport: Report = {
id: Date.now(),
building: input.building,
floor: input.floor,
room_code: input.roomCode,
room_name: input.roomName ?? "",
description: input.description ?? "",
image_uri: input.imageUri ?? "",
created_at: new Date().toISOString(),
};

reports.unshift(newReport);
saveStoredReports(reports);

return Promise.resolve();
}

export function fetchReports(): Promise<Report[]> {
const reports = getStoredReports();
return Promise.resolve(reports);
}

export function deleteReport(id: number): Promise<void> {
const reports = getStoredReports().filter((report) => report.id !== id);
saveStoredReports(reports);
return Promise.resolve();
}

export function clearAllReports(): Promise<void> {
saveStoredReports([]);
return Promise.resolve();
}