require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// ===== API Key Middleware =====
app.use((req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid API Key"
        });
    }

    next();
});

app.post("/send-dsr", async (req, res) => {

    const rows = req.body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid DSR data"
        });
    }

    const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit"
    }).replace(/ /g, "-");

    const senderName = process.env.SENDER_NAME;
    const receiverName = process.env.RECEIVER_NAME;
    const teamName = process.env.TEAM_NAME;

    let tableRows = "";

    rows.forEach(row => {
        tableRows += `
        <tr>
            <td>${currentDate}</td>
            <td>${teamName}</td>
            <td>${row.yesterdayWork || ""}</td>
            <td>${row.todayWork || ""}</td>
            <td>${row.blockers || ""}</td>
            <td>${row.ticketId || ""}</td>
            <td>${row.status || ""}</td>
            <td>${row.eta || ""}</td>
            <td>${row.comments || ""}</td>
        </tr>
        `;
    });

    const html = `
    <html>
    <body style="font-family: Arial, sans-serif;">
        <p>Hi ${receiverName},</p>
        <p>Here is my DSR</p>

        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color:#f2f2f2;">
                <th>Date</th>
                <th>Team</th>
                <th>Yesterday – Completed Work</th>
                <th>Today – Planned Work</th>
                <th>Blockers</th>
                <th>Odoo Ticket</th>
                <th>Status</th>
                <th>ETA</th>
                <th>Comments</th>
            </tr>
            ${tableRows}
        </table>

        <br/>
        <p>Thanks,<br/>${senderName}</p>
    </body>
    </html>
    `;

    try {

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: `"${senderName}" <${process.env.EMAIL}>`,
            to: process.env.RECEIVER_EMAILS.split(","),
            subject: `DSR - ${senderName} ${currentDate}`,
            html: html
        });

        res.json({
            success: true,
            message: "DSR Sent Successfully"
        });

    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({
            success: false,
            message: "Email sending failed",
            error: error.message
        });
    }
});

app.get("/", (req, res) => {
    res.json({ status: "Secure DSR API Running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Secure DSR API running on port ${PORT}`);
});