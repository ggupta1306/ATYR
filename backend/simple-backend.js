const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running!' });
});

// Get products
app.get('/api/products', (req, res) => {
    res.json([
        {
            id: 1,
            name: "Classic White Shirt",
            category: "top",
            price: 29.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/ffffff/000000?text=White+Shirt",
            tags: "casual, office, classic"
        },
        {
            id: 2,
            name: "Denim Jeans",
            category: "bottom", 
            price: 49.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/0066cc/ffffff?text=Denim+Jeans",
            tags: "casual, everyday, denim"
        },
        {
            id: 3,
            name: "Black Blazer",
            category: "top",
            price: 89.99,
            brand: "ATYR", 
            image: "https://via.placeholder.com/400x500/000000/ffffff?text=Black+Blazer",
            tags: "formal, office, professional"
        },
        {
            id: 4,
            name: "Chino Pants",
            category: "bottom",
            price: 39.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/8B4513/ffffff?text=Chino+Pants", 
            tags: "casual, smart-casual, versatile"
        }
    ]);
});

// Get tops
app.get('/api/tops', (req, res) => {
    res.json([
        {
            id: 1,
            name: "Classic White Shirt",
            category: "top",
            price: 29.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/ffffff/000000?text=White+Shirt",
            tags: "casual, office, classic"
        },
        {
            id: 3,
            name: "Black Blazer",
            category: "top",
            price: 89.99,
            brand: "ATYR", 
            image: "https://via.placeholder.com/400x500/000000/ffffff?text=Black+Blazer",
            tags: "formal, office, professional"
        }
    ]);
});

// Get bottoms
app.get('/api/bottoms', (req, res) => {
    res.json([
        {
            id: 2,
            name: "Denim Jeans",
            category: "bottom", 
            price: 49.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/0066cc/ffffff?text=Denim+Jeans",
            tags: "casual, everyday, denim"
        },
        {
            id: 4,
            name: "Chino Pants",
            category: "bottom",
            price: 39.99,
            brand: "ATYR",
            image: "https://via.placeholder.com/400x500/8B4513/ffffff?text=Chino+Pants", 
            tags: "casual, smart-casual, versatile"
        }
    ]);
});

// AI Recommendation
app.post('/api/ai-recommendation', (req, res) => {
    const { occasion } = req.body;
    
    const recommendations = {
        "office": {
            top: {
                id: 1,
                name: "Classic White Shirt",
                category: "top",
                price: 29.99,
                brand: "ATYR",
                image: "https://via.placeholder.com/400x500/ffffff/000000?text=White+Shirt",
                tags: "casual, office, classic"
            },
            bottom: {
                id: 4,
                name: "Chino Pants",
                category: "bottom",
                price: 39.99,
                brand: "ATYR",
                image: "https://via.placeholder.com/400x500/8B4513/ffffff?text=Chino+Pants", 
                tags: "casual, smart-casual, versatile"
            }
        },
        "casual": {
            top: {
                id: 1,
                name: "Classic White Shirt",
                category: "top",
                price: 29.99,
                brand: "ATYR",
                image: "https://via.placeholder.com/400x500/ffffff/000000?text=White+Shirt",
                tags: "casual, office, classic"
            },
            bottom: {
                id: 2,
                name: "Denim Jeans",
                category: "bottom", 
                price: 49.99,
                brand: "ATYR",
                image: "https://via.placeholder.com/400x500/0066cc/ffffff?text=Denim+Jeans",
                tags: "casual, everyday, denim"
            }
        },
        "formal": {
            top: {
                id: 3,
                name: "Black Blazer",
                category: "top",
                price: 89.99,
                brand: "ATYR", 
                image: "https://via.placeholder.com/400x500/000000/ffffff?text=Black+Blazer",
                tags: "formal, office, professional"
            },
            bottom: {
                id: 4,
                name: "Chino Pants",
                category: "bottom",
                price: 39.99,
                brand: "ATYR",
                image: "https://via.placeholder.com/400x500/8B4513/ffffff?text=Chino+Pants", 
                tags: "casual, smart-casual, versatile"
            }
        }
    };
    
    const recommendation = recommendations[occasion] || recommendations["casual"];
    
    res.json({
        success: true,
        recommendation: {
            ...recommendation,
            occasion: occasion,
            reasoning: `Perfect for ${occasion}! This combination balances style and comfort.`
        }
    });
});

// Serve admin dashboard
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Simple Backend running on http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

// Keep alive
setInterval(() => {
    // Keep the process alive
}, 1000);
