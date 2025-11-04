const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'poker-sessions.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Endpoint to save session data
app.post('/api/save', (req, res) => {
    try {
        const sessions = req.body;
        const dataStr = JSON.stringify(sessions, null, 2);
        fs.writeFileSync(DATA_FILE, dataStr, 'utf8');
        
        // Log the save with timestamp
        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] Data saved to ${DATA_FILE} (${sessions.length} sessions)`);
        
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Data will be saved to: ${DATA_FILE}`);
    console.log(`Current directory: ${__dirname}`);
});
