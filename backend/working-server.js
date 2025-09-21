const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001; // Changed port

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running!' });
});

// Serve admin dashboard
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
});

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        process.exit(0);
    });
});

// Keep alive
setInterval(() => {
    // Keep the process alive
}, 1000);