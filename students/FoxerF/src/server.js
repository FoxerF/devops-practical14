import express from "express";
import { randomUUID } from "node:crypto";
import {
    mkdir,
    readFile,
    rename,
    writeFile
} from "node:fs/promises";
import path from "node:path";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const DATA_FILE =
    process.env.DATA_FILE || "/app/data/sessions.json";

let sessions = [];
let writeQueue = Promise.resolve();

app.disable("x-powered-by");

app.use(express.json({ limit: "32kb" }));

async function loadSessions() {
    await mkdir(path.dirname(DATA_FILE), {
        recursive: true
    });

    try {
        const content = await readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
            throw new Error("Invalid sessions data file.");
        }

        sessions = parsed;
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }

        sessions = [];

        await writeFile(
            DATA_FILE,
            "[]\n",
            "utf8"
        );
    }
}

async function persistSessions() {
    const snapshot =
        JSON.stringify(sessions, null, 2) + "\n";

    const nextWrite = writeQueue.then(async () => {
        const temporaryFile = `${DATA_FILE}.tmp`;

        await writeFile(
            temporaryFile,
            snapshot,
            "utf8"
        );

        await rename(temporaryFile, DATA_FILE);
    });

    writeQueue = nextWrite.catch(() => { });

    await nextWrite;
}

app.get("/", (_req, res) => {
    res.json({
        name: "Focus Session Tracker",
        description: "API for recording and analyzing study sessions.",
        endpoints: {
            health: "GET /health",
            listSessions: "GET /api/sessions",
            createSession: "POST /api/sessions",
            deleteSession: "DELETE /api/sessions/:id",
            statistics: "GET /api/stats"
        }
    });
});

app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        sessionCount: sessions.length
    });
});

app.get("/api/sessions", (req, res) => {
    let result = sessions;

    if (typeof req.query.subject === "string") {
        const subject = req.query.subject.trim().toLowerCase();

        result = sessions.filter(
            session =>
                session.subject.toLowerCase() === subject
        );
    }

    res.json({
        count: result.length,
        sessions: result
    });
});

app.post("/api/sessions", async (req, res) => {
    const title =
        typeof req.body?.title === "string"
            ? req.body.title.trim()
            : "";

    const subject =
        typeof req.body?.subject === "string" &&
            req.body.subject.trim()
            ? req.body.subject.trim()
            : "General";

    const durationMinutes =
        Number(req.body?.durationMinutes);

    if (!title || title.length > 120) {
        return res.status(400).json({
            error: "Title must contain between 1 and 120 characters."
        });
    }

    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 600
    ) {
        return res.status(400).json({
            error: "Duration must be an integer between 1 and 600 minutes."
        });
    }

    if (subject.length > 60) {
        return res.status(400).json({
            error: "Subject cannot exceed 60 characters."
        });
    }

    const session = {
        id: randomUUID(),
        title,
        subject,
        durationMinutes,
        createdAt: new Date().toISOString()
    };

    sessions.unshift(session);

    await persistSessions();

    res.status(201).json(session);
});

app.delete("/api/sessions/:id", async (req, res) => {
    const index = sessions.findIndex(
        session => session.id === req.params.id
    );

    if (index === -1) {
        return res.status(404).json({
            error: "Session not found."
        });
    }

    const [removed] = sessions.splice(index, 1);

    await persistSessions();

    res.json({
        deleted: true,
        session: removed
    });
});

app.get("/api/stats", (_req, res) => {
    const totalMinutes = sessions.reduce(
        (total, session) =>
            total + session.durationMinutes,
        0
    );

    const bySubject = sessions.reduce(
        (summary, session) => {
            const subject = session.subject;

            if (!summary[subject]) {
                summary[subject] = {
                    sessions: 0,
                    totalMinutes: 0
                };
            }

            summary[subject].sessions += 1;
            summary[subject].totalMinutes +=
                session.durationMinutes;

            return summary;
        },
        {}
    );

    res.json({
        totalSessions: sessions.length,
        totalMinutes,
        totalHours: Number(
            (totalMinutes / 60).toFixed(2)
        ),
        bySubject
    });
});

app.use((_req, res) => {
    res.status(404).json({
        error: "Route not found."
    });
});

app.use((error, _req, res, _next) => {
    console.error(error);

    const status = error.status || 500;

    res.status(status).json({
        error: status === 500
            ? "Internal server error."
            : error.message
    });
});

await loadSessions();

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Focus Session Tracker running on port ${PORT}`
    );
});