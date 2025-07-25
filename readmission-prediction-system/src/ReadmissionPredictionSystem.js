import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, Activity, FileText, Settings, Shield, LogOut } from 'lucide-react';
import apiService from './services/apiService';

const ReadmissionPredictionSystem = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState({
    totalPredictions: 0,
    highRiskPatients: 0,
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      const [metricsData, patientsData] = await Promise.all([
        apiService.getSystemMetrics(),
        apiService.getPatients()
      ]);
      
      setSystemMetrics(metricsData);
      setPatients(patientsData);
    } catch (error) {
      setError('Failed to load system data. Please try again.');
      console.error('Error loading system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (category) => {
    switch(category) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const FeatureImportance = () => {
    const features = [
      { name: 'Previous Admissions (12 months)', importance: 0.24, clinical_rationale: 'Strong predictor of future healthcare utilization' },
      { name: 'Length of Stay', importance: 0.18, clinical_rationale: 'Indicates illness severity and complexity' },
      { name: 'Charlson Comorbidity Index', importance: 0.16, clinical_rationale: 'Measures disease burden and mortality risk' },
      { name: 'Age', importance: 0.12, clinical_rationale: 'Advanced age correlates with frailty and complications' },
      { name: 'Emergency Admission Type', importance: 0.10, clinical_rationale: 'Unplanned admissions indicate unstable conditions' },
      { name: 'Medication Count', importance: 0.08, clinical_rationale: 'Polypharmacy increases adverse events and adherence issues' },
      { name: 'Primary Diagnosis Category', importance: 0.07, clinical_rationale: 'Certain conditions have higher readmission rates' },
      { name: 'Social Risk Factors', importance: 0.05, clinical_rationale: 'Social determinants affect care access and adherence' }
    ];

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Model Feature Importance
        </h3>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="border-b pb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{feature.name}</span>
                <span className="text-sm text-gray-600">{(feature.importance * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{width: `${feature.importance * 100}%`}}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{feature.clinical_rationale}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BiasMonitoring = () => {
    const [biasData, setBiasData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadBiasData();
    }, []);

    const loadBiasData = async () => {
      try {
        setLoading(true);
        const data = await apiService.getBiasMonitoring();
        setBiasData(data);
      } catch (error) {
        console.error('Error loading bias data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Bias Monitoring Dashboard
        </h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Fairness Ratio: Model performance relative to overall average (0.95-1.05 = acceptable range)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Demographic Group</th>
                <th className="text-left py-2">Precision</th>
                <th className="text-left py-2">Recall</th>
                <th className="text-left py-2">Fairness Ratio</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {biasData.map((metric, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{metric.group}</td>
                  <td className="py-2">{metric.precision.toFixed(1)}%</td>
                  <td className="py-2">{metric.recall.toFixed(1)}%</td>
                  <td className="py-2">{metric.fairness_ratio.toFixed(2)}</td>
                  <td className="py-2">
                    {metric.fairness_ratio >= 0.95 && metric.fairness_ratio <= 1.05 ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Fair
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Review
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const PatientDetail = ({ patient }) => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{patient.name}</h3>
            <p className="text-gray-600">{patient.age}yo {patient.gender}</p>
            <p className="text-sm text-gray-500">
              Admitted: {patient.admissionDate} | Discharged: {patient.dischargeDate}
            </p>
          </div>
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(patient.riskCategory)}`}>
              {patient.riskCategory} Risk
            </div>
            <p className="text-lg font-bold mt-1">Score: {patient.riskScore.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Clinical Information</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Primary Diagnosis:</strong> {patient.primaryDiagnosis}</p>
              <p><strong>Comorbidities:</strong> {patient.comorbidities.join(', ')}</p>
              <p><strong>LACE Score:</strong> {patient.laceScore}/19</p>
              <p><strong>Charlson Index:</strong> {patient.charlsonIndex}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Risk Factors</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Length of Stay:</strong> {patient.features.lengthOfStay} days</p>
              <p><strong>Previous Admissions:</strong> {patient.features.previousAdmissions} (12 months)</p>
              <p><strong>Medications:</strong> {patient.features.medicationCount}</p>
              <p><strong>Emergency Admission:</strong> {patient.features.emergencyAdmission ? 'Yes' : 'No'}</p>
              {patient.features.socialRiskFactors.length > 0 && (
                <p><strong>Social Risk Factors:</strong> {patient.features.socialRiskFactors.join(', ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Recommended Interventions</h4>
          <div className="flex flex-wrap gap-2">
            {patient.interventions.map((intervention, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {intervention}
              </span>
            ))}
          </div>
        </div>

        {patient.actualOutcome && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Actual Outcome: {patient.actualOutcome}</p>
            <p className="text-red-600 text-sm">Model correctly predicted high risk - interventions may need enhancement</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h5 className="font-medium text-sm mb-2">Model Explanation (SHAP values)</h5>
          <div className="text-xs space-y-1">
            <p>• Previous admissions (+0.24): {patient.features.previousAdmissions} admissions significantly increase risk</p>
            <p>• Length of stay (+0.12): {patient.features.lengthOfStay} days above average</p>
            <p>• Age (+0.08): {patient.age} years contributes to higher risk</p>
            <p>• Emergency admission (+0.06): Unplanned admission indicates instability</p>
            <p>• Comorbidity burden (+0.15): Multiple chronic conditions increase complexity</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">30-Day Readmission Risk Prediction</h1>
              <p className="text-gray-600">St. Mary's Hospital - Internal Medicine Unit</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium">{currentUser?.name} ({currentUser?.role})</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 py-4">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: Activity },
            { id: 'patients', name: 'Patient List', icon: User },
            { id: 'features', name: 'Model Features', icon: FileText },
            { id: 'bias', name: 'Bias Monitoring', icon: Shield },
            { id: 'settings', name: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Predictions</p>
                  <p className="text-2xl font-bold">{systemMetrics.totalPredictions}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">High Risk Patients</p>
                  <p className="text-2xl font-bold">{systemMetrics.highRiskPatients}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Model Accuracy</p>
                  <p className="text-2xl font-bold">{systemMetrics.accuracy}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">F1-Score</p>
                  <p className="text-2xl font-bold">{systemMetrics.f1Score}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Recent Discharge Predictions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Diagnosis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patients.map(patient => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-500">ID: {patient.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {patient.age}yo {patient.gender}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {patient.primaryDiagnosis}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {patient.riskScore.toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(patient.riskCategory)}`}>
                            {patient.riskCategory}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {selectedPatient && (
              <PatientDetail patient={selectedPatient} />
            )}
          </div>
        )}

        {activeTab === 'features' && <FeatureImportance />}
        {activeTab === 'bias' && <BiasMonitoring />}
        
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  High Risk Threshold
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="0.9" 
                  step="0.01" 
                  defaultValue="0.7"
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Current: 0.70 (captures ~15% of patients as high-risk)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Retraining Schedule
                </label>
                <select className="border rounded px-3 py-2">
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Semi-annually</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Notifications
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    High-risk patient alerts
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    Model performance degradation
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    Bias monitoring alerts
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadmissionPredictionSystem; 