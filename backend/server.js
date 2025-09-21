const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.body.category || 'general';
        const uploadPath = path.join(uploadsDir, category);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Initialize SQLite database
const db = new sqlite3.Database('atyr.db');

// Create tables
db.serialize(() => {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT DEFAULT 'atyr',
        price REAL NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        sizes TEXT,
        occasion TEXT,
        tags TEXT,
        main_image TEXT,
        gallery_images TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default categories
    db.run(`INSERT OR IGNORE INTO categories (name, description) VALUES 
        ('tops', 'Upper body clothing items'),
        ('bottoms', 'Lower body clothing items')`);
});

// API Routes

// Health check
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

// Get products by category
app.get('/api/products/:category', (req, res) => {
    const category = req.params.category;
    db.all('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC', [category], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get tops
app.get('/api/tops', (req, res) => {
    db.all('SELECT * FROM products WHERE category = "tops" ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get bottoms
app.get('/api/bottoms', (req, res) => {
    db.all('SELECT * FROM products WHERE category = "bottoms" ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single product
app.get('/api/product/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(row);
    });
});

// Create new product
app.post('/api/products', upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 }
]), (req, res) => {
    const { name, brand, price, description, category, sizes, occasion, tags } = req.body;
    
    const mainImage = req.files.main_image ? req.files.main_image[0].filename : null;
    const galleryImages = req.files.gallery_images ? 
        req.files.gallery_images.map(file => file.filename).join(',') : null;

    db.run(
        `INSERT INTO products (name, brand, price, description, category, sizes, occasion, tags, main_image, gallery_images) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, brand, price, description, category, sizes, occasion, tags, mainImage, galleryImages],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                id: this.lastID, 
                message: 'Product created successfully',
                product: {
                    id: this.lastID,
                    name,
                    brand,
                    price,
                    description,
                    category,
                    sizes,
                    occasion,
                    tags,
                    main_image: mainImage,
                    gallery_images: galleryImages
                }
            });
        }
    );
});

// Update product
app.put('/api/products/:id', upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 }
]), (req, res) => {
    const id = req.params.id;
    const { name, brand, price, description, category, sizes, occasion, tags } = req.body;
    
    // Get existing product first
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, existingProduct) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!existingProduct) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        const mainImage = req.files.main_image ? 
            req.files.main_image[0].filename : 
            existingProduct.main_image;
        
        const galleryImages = req.files.gallery_images ? 
            req.files.gallery_images.map(file => file.filename).join(',') : 
            existingProduct.gallery_images;

        db.run(
            `UPDATE products SET 
             name = ?, brand = ?, price = ?, description = ?, category = ?, 
             sizes = ?, occasion = ?, tags = ?, main_image = ?, gallery_images = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, brand, price, description, category, sizes, occasion, tags, mainImage, galleryImages, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ 
                    message: 'Product updated successfully',
                    changes: this.changes
                });
            }
        );
    });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    
    // Get product info to delete associated images
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Delete associated images
        if (product.main_image) {
            const mainImagePath = path.join(uploadsDir, product.category, product.main_image);
            if (fs.existsSync(mainImagePath)) {
                fs.unlinkSync(mainImagePath);
            }
        }

        if (product.gallery_images) {
            const galleryImages = product.gallery_images.split(',');
            galleryImages.forEach(imageName => {
                const imagePath = path.join(uploadsDir, product.category, imageName);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }

        // Delete from database
        db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
    res.json({
                message: 'Product deleted successfully',
                changes: this.changes
            });
        });
    });
});

// Get categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ATYR Backend running on http://localhost:${PORT}`);
    console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
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
