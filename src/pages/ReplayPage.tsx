import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PoseReplay from '../components/PoseReplay';

const ReplayPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [poseData, setPoseData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);
        
        // Validate JSON structure
        if (!Array.isArray(json)) {
          throw new Error('JSON must be an array of pose frames');
        }

        if (json.length === 0) {
          throw new Error('JSON array is empty');
        }

        // Validate first frame has required fields
        const firstFrame = json[0];
        if (!firstFrame.frame_number && firstFrame.frame_number !== 0) {
          throw new Error('Each frame must have a frame_number field');
        }
        if (!firstFrame.timestamp && firstFrame.timestamp !== 0) {
          throw new Error('Each frame must have a timestamp field');
        }
        if (!Array.isArray(firstFrame.landmarks)) {
          throw new Error('Each frame must have a landmarks array');
        }
        if (firstFrame.landmarks.length !== 33) {
          throw new Error('Each frame must have exactly 33 landmarks');
        }

        // Validate landmark structure
        const firstLandmark = firstFrame.landmarks[0];
        if (
          typeof firstLandmark.x !== 'number' ||
          typeof firstLandmark.y !== 'number' ||
          typeof firstLandmark.z !== 'number' ||
          typeof firstLandmark.visibility !== 'number'
        ) {
          throw new Error('Each landmark must have x, y, z, and visibility as numbers');
        }

        setPoseData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid JSON format');
        setPoseData([]);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setPoseData([]);
    };

    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setPoseData([]);
    setFileName('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Pose Replay
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Upload a JSON file with pose data to replay the movement
        </Typography>
      </Box>

      {/* Upload Section */}
      {!poseData.length && (
        <Paper sx={{ p: 6, textAlign: 'center', mb: 3 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Upload Pose Data JSON
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a JSON file containing pose landmarks from a previous assessment
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={handleUploadClick}
          >
            Choose File
          </Button>

          {fileName && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Selected: {fileName}
            </Typography>
          )}
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <strong>Error loading file:</strong> {error}
        </Alert>
      )}

      {/* Replay Component */}
      {poseData.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Loaded: {fileName} ({poseData.length} frames)
            </Typography>
            <Button variant="outlined" onClick={handleClear}>
              Load Different File
            </Button>
          </Box>
          
          <PoseReplay
            poseData={poseData}
            width={640}
            height={480}
            onComplete={() => {
              console.log('Replay completed');
            }}
          />
        </>
      )}

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          JSON Format Requirements
        </Typography>
        <Typography variant="body2" component="div" color="text.secondary">
          The JSON file must be an array of pose frames with the following structure:
          <Box component="pre" sx={{ 
            bgcolor: '#f5f5f5', 
            p: 2, 
            mt: 2, 
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem',
          }}>
{`[
  {
    "frame_number": 0,
    "timestamp": 0,
    "landmarks": [
      {
        "x": 0.5,
        "y": 0.3,
        "z": -0.2,
        "visibility": 0.95
      },
      // ... 32 more landmarks (33 total)
    ]
  },
  // ... more frames
]`}
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Requirements:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Each frame must have <code>frame_number</code>, <code>timestamp</code>, and <code>landmarks</code></li>
              <li>Each frame must have exactly 33 landmarks (MediaPipe Pose format)</li>
              <li>Each landmark must have <code>x</code>, <code>y</code>, <code>z</code>, and <code>visibility</code> (all numbers)</li>
              <li>Coordinates are normalized: x, y in range [0, 1], z in range [-1, 1]</li>
              <li>Visibility in range [0, 1] where 1 is fully visible</li>
              <li>Timestamps should be in milliseconds</li>
            </ul>
          </Box>
        </Typography>
      </Paper>

      {/* Export Example */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Export Pose Data
        </Typography>
        <Typography variant="body2" color="text.secondary">
          During an assessment session, pose data is automatically recorded. To export:
        </Typography>
        <Box sx={{ mt: 2 }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Complete an assessment session</li>
            <li>View the session in Admin Dashboard or Results page</li>
            <li>The pose data is stored in the backend database</li>
            <li>Use the backend API endpoint: <code>GET /api/sessions/{'{id}'}/pose-data</code></li>
            <li>Save the JSON response to a file</li>
            <li>Upload that file here to replay the movement</li>
          </ol>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Note:</strong> The pose data export endpoint needs to be implemented in the backend.
          Currently, this page uses mock data for demonstration.
        </Alert>
      </Paper>
    </Container>
  );
};

export default ReplayPage;
