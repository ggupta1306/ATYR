const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running!' });
});

app.get('/api/products', (req, res) => {
    res.json([
        { id: 1, name: "White Tee", price: 29.99, category: "top" },
        { id: 2, name: "Blue Jeans", price: 79.99, category: "bottom" }
    ]);
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
