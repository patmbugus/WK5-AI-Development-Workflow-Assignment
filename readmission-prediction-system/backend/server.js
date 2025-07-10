const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const winston = require('winston');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging setup for HIPAA compliance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock database
const users = [
  {
    id: '1',
    username: 'dr.smith',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'physician',
    name: 'Dr. Sarah Smith',
    department: 'Internal Medicine'
  },
  {
    id: '2',
    username: 'nurse.jones',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'nurse',
    name: 'Nurse Mary Jones',
    department: 'Internal Medicine'
  }
];

const patients = [
  {
    id: 'P001',
    name: 'Patient A',
    age: 67,
    gender: 'Female',
    admissionDate: '2024-12-15',
    dischargeDate: '2024-12-20',
    primaryDiagnosis: 'Heart Failure with Reduced Ejection Fraction',
    comorbidities: ['Diabetes Type 2', 'Hypertension', 'CKD Stage 3'],
    riskScore: 0.78,
    riskCategory: 'High',
    laceScore: 12,
    charlsonIndex: 4,
    features: {
      lengthOfStay: 5,
      emergencyAdmission: true,
      previousAdmissions: 3,
      medicationCount: 12,
      socialRiskFactors: ['Lives alone', 'Limited transportation'],
      vitalTrends: 'Improving',
      labTrends: 'Stable'
    },
    interventions: ['Discharge planning', 'Home health referral', '48hr follow-up call'],
    actualOutcome: null
  }
];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      logger.error('Token verification failed', { error: err.message });
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', { 
        user: req.user.username, 
        role: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn('Failed login attempt', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name,
        department: user.department
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    logger.info('Successful login', { username, role: user.role });
    res.json({ 
      token, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        department: user.department
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ML Model prediction endpoint
app.post('/api/predict/readmission', authenticateToken, requireRole(['physician', 'nurse']), async (req, res) => {
  try {
    const patientData = req.body;
    
    logger.info('Prediction request', {
      user: req.user.username,
      patientId: patientData.patientId,
      timestamp: new Date().toISOString()
    });

    const requiredFields = ['age', 'gender', 'primaryDiagnosis', 'lengthOfStay', 'previousAdmissions'];
    for (const field of requiredFields) {
      if (!patientData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const prediction = await generatePrediction(patientData);
    
    logger.info('Prediction completed', {
      user: req.user.username,
      patientId: patientData.patientId,
      riskScore: prediction.riskScore,
      riskCategory: prediction.riskCategory
    });

    res.json(prediction);
  } catch (error) {
    logger.error('Prediction error', { error: error.message, user: req.user.username });
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Get patient list
app.get('/api/patients', authenticateToken, requireRole(['physician', 'nurse']), (req, res) => {
  try {
    const patientList = patients.map(patient => ({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      primaryDiagnosis: patient.primaryDiagnosis,
      riskScore: patient.riskScore,
      riskCategory: patient.riskCategory,
      dischargeDate: patient.dischargeDate
    }));

    logger.info('Patient list accessed', { user: req.user.username });
    res.json(patientList);
  } catch (error) {
    logger.error('Error fetching patients', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient details
app.get('/api/patients/:id', authenticateToken, requireRole(['physician', 'nurse']), (req, res) => {
  try {
    const patient = patients.find(p => p.id === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    logger.info('Patient details accessed', { 
      user: req.user.username, 
      patientId: req.params.id 
    });
    res.json(patient);
  } catch (error) {
    logger.error('Error fetching patient details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// Get system metrics
app.get('/api/metrics', authenticateToken, requireRole(['physician', 'nurse']), (req, res) => {
  try {
    const metrics = {
      totalPredictions: 1247,
      highRiskPatients: 186,
      accuracy: 89.3,
      precision: 76.2,
      recall: 68.9,
      f1Score: 72.3,
      lastUpdated: new Date().toISOString()
    };

    logger.info('Metrics accessed', { user: req.user.username });
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get bias monitoring data
app.get('/api/bias-monitoring', authenticateToken, requireRole(['physician', 'nurse']), (req, res) => {
  try {
    const biasMetrics = [
      { group: 'Age 65+', precision: 74.2, recall: 71.8, fairness_ratio: 0.96 },
      { group: 'Age <65', precision: 78.1, recall: 66.2, fairness_ratio: 1.04 },
      { group: 'Female', precision: 76.8, recall: 69.4, fairness_ratio: 1.01 },
      { group: 'Male', precision: 75.6, recall: 68.3, fairness_ratio: 0.99 },
      { group: 'White', precision: 77.2, recall: 70.1, fairness_ratio: 1.02 },
      { group: 'Black/African American', precision: 74.1, recall: 66.8, fairness_ratio: 0.96 },
      { group: 'Hispanic/Latino', precision: 75.9, recall: 68.9, fairness_ratio: 0.99 },
      { group: 'Medicaid', precision: 73.5, recall: 65.2, fairness_ratio: 0.94 },
      { group: 'Medicare', precision: 76.8, recall: 70.4, fairness_ratio: 1.01 },
      { group: 'Commercial', precision: 78.9, recall: 69.7, fairness_ratio: 1.05 }
    ];

    logger.info('Bias monitoring data accessed', { user: req.user.username });
    res.json(biasMetrics);
  } catch (error) {
    logger.error('Error fetching bias monitoring data', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch bias monitoring data' });
  }
});

// Mock ML model prediction function
async function generatePrediction(patientData) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  let riskScore = 0.3;
  
  if (patientData.age > 65) riskScore += 0.15;
  if (patientData.age > 80) riskScore += 0.1;
  
  if (patientData.lengthOfStay > 7) riskScore += 0.2;
  if (patientData.lengthOfStay > 14) riskScore += 0.15;
  
  if (patientData.previousAdmissions > 2) riskScore += 0.25;
  if (patientData.previousAdmissions > 5) riskScore += 0.2;
  
  const highRiskDiagnoses = ['Heart Failure', 'COPD', 'Diabetes', 'Kidney Disease'];
  if (highRiskDiagnoses.some(diagnosis => 
    patientData.primaryDiagnosis.toLowerCase().includes(diagnosis.toLowerCase())
  )) {
    riskScore += 0.2;
  }
  
  if (patientData.emergencyAdmission) riskScore += 0.1;
  
  riskScore = Math.min(riskScore, 0.95);
  
  let riskCategory = 'Low';
  if (riskScore >= 0.7) riskCategory = 'High';
  else if (riskScore >= 0.4) riskCategory = 'Medium';
  
  const interventions = [];
  if (riskCategory === 'High') {
    interventions.push('Enhanced discharge planning', 'Home health referral', '48hr follow-up call');
  } else if (riskCategory === 'Medium') {
    interventions.push('Standard discharge planning', '7-day follow-up call');
  } else {
    interventions.push('Standard discharge');
  }
  
  return {
    riskScore: parseFloat(riskScore.toFixed(3)),
    riskCategory,
    interventions,
    confidence: 0.85,
    modelVersion: 'v2.1.3',
    predictionTimestamp: new Date().toISOString(),
    featureImportance: {
      'Previous Admissions': 0.24,
      'Length of Stay': 0.18,
      'Age': 0.12,
      'Primary Diagnosis': 0.15,
      'Emergency Admission': 0.10
    }
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.1.3'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    user: req.user?.username 
  });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Healthcare AI API server running on port ${PORT}`);
  logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV });
});

module.exports = app; 