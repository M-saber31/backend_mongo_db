const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// Add multer for file uploads
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://192.168.0.145:8081'], // React Native dev server
  credentials: true
}));
app.use(express.json());

mongoose.connection.on('open', () => {
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) console.error('Error listing collections:', err);
    else console.log('Collections:', collections.map(c => c.name));
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Submission Schema
const submissionSchema = new mongoose.Schema({
  _id: { type: String, required: true},
  title: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['Rented', 'Borrowed', 'Expired'], required: true },
  date: { type: String, required: true },
  rating: { type: Number, default: null },
  image: { type: String, required: true },
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
    const newSubmission = new Submission({
      _id: req.body.id || new mongoose.Types.ObjectId().toString(), // Generate ID if not provided
      title: req.body.title,
      subject: req.body.subject,
      status: 'Pending', // Default status
      date: new Date().toISOString().split('T')[0],
      rating: null,
      image: req.file ? req.file.buffer.toString('base64') : '', // Store image as base64
      feedback: req.body.description || null,
    });
    await newSubmission.save();
    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ message: 'Error saving submission' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});