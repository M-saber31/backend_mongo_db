const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Configure multer for disk storage (temporary, as Render's file system is ephemeral)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors({
  origin: [
    'http://localhost:19006', // Expo dev server
    'http://localhost:8081', // Your current setting
    'http://192.168.0.145:8081',
    'https://your-app-domain.com', // Add your deployed frontend domain
  ],
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

mongoose.connection.on('open', () => {
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) console.error('Error listing collections:', err);
    else console.log('Collections:', collections.map(c => c.name));
  });
});

// Submission Schema
const submissionSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'Rented', 'Borrowed', 'Expired'], // Include 'pending'
    default: 'pending',
    required: true,
  },
  date: { type: String, required: true },
  rating: { type: Number, default: null },
  image: { type: String, required: true }, // Stores file path
  feedback: { type: String, default: null },
});

const Submission = mongoose.model('Submission', submissionSchema);

// GET Endpoint to Fetch All Submissions
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find();
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
});

// POST Endpoint to Save Submission
app.post('/api/submissions', upload.single('image'), async (req, res) => {
  try {
    console.log('Received body:', req.body);
    console.log('Received file:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const newSubmission = new Submission({
      _id: req.body.id || new mongoose.Types.ObjectId().toString(),
      title: req.body.title,
      subject: req.body.subject,
      status: req.body.status || 'pending', // Use frontend value or default
      date: req.body.date || new Date().toISOString().split('T')[0],
      rating: req.body.rating || null,
      image: req.file.path, // Store file path
      feedback: req.body.description || null,
    });

    await newSubmission.save();
    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ message: 'Error saving submission', error: error.message });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});