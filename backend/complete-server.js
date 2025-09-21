const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Initialize SQLite database
const db = new sqlite3.Database('fashion_marketplace.db');

// Create tables
db.serialize(() => {
    // Style categories table
    db.run(`CREATE TABLE IF NOT EXISTS style_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Style category images table
    db.run(`CREATE TABLE IF NOT EXISTS style_category_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        image_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES style_categories (id)
    )`);

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2),
        brand TEXT,
        category TEXT NOT NULL,
        main_image TEXT NOT NULL,
        tags TEXT,
        sizes TEXT,
        occasions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Product gallery images table
    db.run(`CREATE TABLE IF NOT EXISTS product_gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        image_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // User swipes table for AI learning
    db.run(`CREATE TABLE IF NOT EXISTS user_swipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        category_id INTEGER,
        image_path TEXT,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES style_categories (id)
    )`);

    // User preferences table
    db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running!' });
});

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get tops
app.get('/api/tops', (req, res) => {
    db.all("SELECT * FROM products WHERE category = 'top' ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get bottoms
app.get('/api/bottoms', (req, res) => {
    db.all("SELECT * FROM products WHERE category = 'bottom' ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get style categories
app.get('/api/style-categories', (req, res) => {
    db.all('SELECT * FROM style_categories ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get style category images
app.get('/api/style-category-images/:categoryId', (req, res) => {
    const categoryId = req.params.categoryId;
    db.all('SELECT * FROM style_category_images WHERE category_id = ?', [categoryId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Upload style category
app.post('/api/style-categories', upload.array('images', 10), (req, res) => {
    const { name, description } = req.body;
    const images = req.files;

    if (!name || !images || images.length === 0) {
        return res.status(400).json({ error: 'Name and images are required' });
    }

    db.run('INSERT INTO style_categories (name, description) VALUES (?, ?)', [name, description], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const categoryId = this.lastID;
        const imagePromises = images.map(image => {
            return new Promise((resolve, reject) => {
                db.run('INSERT INTO style_category_images (category_id, image_path) VALUES (?, ?)', 
                    [categoryId, image.path], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        });

        Promise.all(imagePromises)
            .then(() => {
                res.json({ 
                    success: true, 
                    message: 'Style category created successfully',
                    categoryId: categoryId
                });
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// Upload product
app.post('/api/products', upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 }
]), (req, res) => {
    const { name, description, price, brand, category, tags, sizes, occasions } = req.body;
    const mainImage = req.files.mainImage ? req.files.mainImage[0] : null;
    const galleryImages = req.files.galleryImages || [];

    if (!name || !category || !mainImage) {
        return res.status(400).json({ error: 'Name, category, and main image are required' });
    }

    db.run(`INSERT INTO products (name, description, price, brand, category, main_image, tags, sizes, occasions) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [name, description, price, brand, category, mainImage.path, tags, sizes, occasions], 
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const productId = this.lastID;
            const galleryPromises = galleryImages.map(image => {
                return new Promise((resolve, reject) => {
                    db.run('INSERT INTO product_gallery (product_id, image_path) VALUES (?, ?)', 
                        [productId, image.path], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            });

            Promise.all(galleryPromises)
                .then(() => {
                    res.json({ 
                        success: true, 
                        message: 'Product created successfully',
                        productId: productId
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: err.message });
                });
        });
});

// Record user swipe
app.post('/api/user-swipe', (req, res) => {
    const { userId, categoryId, imagePath, action } = req.body;

    if (!userId || !imagePath || !action) {
        return res.status(400).json({ error: 'userId, imagePath, and action are required' });
    }

    db.run('INSERT INTO user_swipes (user_id, category_id, image_path, action) VALUES (?, ?, ?, ?)', 
        [userId, categoryId, imagePath, action], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Swipe recorded successfully' });
        });
});

// Get user preferences
app.get('/api/user-preferences/:userId', (req, res) => {
    const userId = req.params.userId;
    db.get('SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || { preferences: '{}' });
    });
});

// Update user preferences
app.post('/api/user-preferences', (req, res) => {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
        return res.status(400).json({ error: 'userId and preferences are required' });
    }

    db.run('INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?)', 
        [userId, JSON.stringify(preferences)], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Preferences updated successfully' });
        });
});

// AI Recommendation endpoint
app.post('/api/ai-recommendation', async (req, res) => {
    const { occasion, userId } = req.body;

    try {
        // Get user preferences
        let userPreferences = {};
        if (userId) {
            const prefs = await new Promise((resolve, reject) => {
                db.get('SELECT preferences FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', 
                    [userId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });
            if (prefs) {
                userPreferences = JSON.parse(prefs.preferences);
            }
        }

        // Get all products
        const products = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Simple AI logic - in production, integrate with GROQ API
        const tops = products.filter(p => p.category === 'top');
        const bottoms = products.filter(p => p.category === 'bottom');

        // Select random top and bottom for now
        const recommendedTop = tops[Math.floor(Math.random() * tops.length)];
        const recommendedBottom = bottoms[Math.floor(Math.random() * bottoms.length)];

        res.json({
            success: true,
            recommendation: {
                top: recommendedTop,
                bottom: recommendedBottom,
                occasion: occasion,
                reasoning: `Perfect for ${occasion}! This combination balances style and comfort.`
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve admin dashboard
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Fashion Marketplace Backend running on http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});
