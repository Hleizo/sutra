# Virtual Mirror Backend - FastAPI Application

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas

# Google TTS (optional)
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

# Import analysis module
from analysis import comprehensive_analysis, Classification

# Initialize FastAPI app
app = FastAPI(
    title="Virtual Mirror API",
    description="Backend API for Early Detection of Motor Weakness in Children",
    version="1.0.0"
)

# Get CORS origins from environment variable
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directories
DATA_DIR = Path("data")
REPORTS_DIR = DATA_DIR / "reports"
AUDIO_DIR = DATA_DIR / "audio"
SESSIONS_DIR = DATA_DIR / "sessions"

# Create directories if they don't exist
for directory in [DATA_DIR, REPORTS_DIR, AUDIO_DIR, SESSIONS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# ==================== Data Models ====================

class JointAngleData(BaseModel):
    leftShoulder: float
    rightShoulder: float
    leftElbow: float
    rightElbow: float
    leftHip: float
    rightHip: float
    leftKnee: float
    rightKnee: float
    timestamp: int

class SessionMetrics(BaseModel):
    session_id: Optional[str] = None
    patient_name: Optional[str] = "Anonymous"
    patient_age: Optional[int] = None
    session_date: Optional[str] = None
    duration: int  # seconds
    joint_angles: List[JointAngleData]
    
    # Task results
    raise_hand_results: Optional[Dict[str, Any]] = None
    balance_results: Optional[Dict[str, Any]] = None
    walk_results: Optional[Dict[str, Any]] = None
    jump_results: Optional[Dict[str, Any]] = None
    
    # Additional notes
    notes: Optional[str] = None

class AnalysisResult(BaseModel):
    session_id: str
    summary: Dict[str, Any]
    recommendations: List[str]
    risk_level: str  # low, moderate, high
    timestamp: str

class TTSRequest(BaseModel):
    text: str
    language: str = "ar"  # Arabic by default
    slow: bool = False

# ==================== Helper Functions ====================

def calculate_summary_statistics(joint_angles: List[JointAngleData]) -> Dict[str, Any]:
    """Calculate statistical summary from joint angle data"""
    if not joint_angles:
        return {}
    
    # Extract all angles for each joint
    joints = {
        'leftShoulder': [], 'rightShoulder': [],
        'leftElbow': [], 'rightElbow': [],
        'leftHip': [], 'rightHip': [],
        'leftKnee': [], 'rightKnee': []
    }
    
    for data in joint_angles:
        for joint in joints.keys():
            joints[joint].append(getattr(data, joint))
    
    # Calculate statistics
    stats = {}
    for joint, values in joints.items():
        if values:
            stats[joint] = {
                'mean': sum(values) / len(values),
                'min': min(values),
                'max': max(values),
                'range': max(values) - min(values)
            }
    
    return stats

def calculate_symmetry(left_values: List[float], right_values: List[float]) -> Dict[str, float]:
    """Calculate symmetry metrics between left and right sides"""
    if not left_values or not right_values:
        return {'difference': 0, 'percentage': 0}
    
    avg_left = sum(left_values) / len(left_values)
    avg_right = sum(right_values) / len(right_values)
    
    difference = abs(avg_left - avg_right)
    avg = (avg_left + avg_right) / 2
    percentage = (difference / avg * 100) if avg > 0 else 0
    
    return {
        'difference': round(difference, 2),
        'percentage': round(percentage, 2),
        'left_avg': round(avg_left, 2),
        'right_avg': round(avg_right, 2)
    }

def generate_recommendations(metrics: SessionMetrics, stats: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on analysis"""
    recommendations = []
    
    # Check shoulder symmetry
    if 'leftShoulder' in stats and 'rightShoulder' in stats:
        left_shoulder = [a.leftShoulder for a in metrics.joint_angles]
        right_shoulder = [a.rightShoulder for a in metrics.joint_angles]
        symmetry = calculate_symmetry(left_shoulder, right_shoulder)
        
        if symmetry['percentage'] > 15:
            recommendations.append(
                f"Shoulder asymmetry detected ({symmetry['percentage']:.1f}%). "
                "Consider exercises to improve shoulder mobility and balance."
            )
    
    # Check range of motion
    for joint, values in stats.items():
        if values['range'] < 30:
            recommendations.append(
                f"Limited range of motion in {joint} ({values['range']:.1f}°). "
                "Stretching and flexibility exercises recommended."
            )
    
    # Task-specific recommendations
    if metrics.raise_hand_results:
        if not metrics.raise_hand_results.get('overallSuccess'):
            recommendations.append(
                "Difficulty raising hands above head detected. "
                "Practice shoulder flexion exercises."
            )
    
    if metrics.balance_results:
        if metrics.balance_results.get('stabilityScore', 100) < 60:
            recommendations.append(
                "Balance concerns noted. Single-leg stance exercises recommended."
            )
    
    if metrics.walk_results:
        if metrics.walk_results.get('gaitSymmetry', 0) > 20:
            recommendations.append(
                "Gait asymmetry detected. Consult with physical therapist for gait training."
            )
    
    if not recommendations:
        recommendations.append("Movement patterns appear normal. Continue regular physical activity.")
    
    return recommendations

def assess_risk_level(metrics: SessionMetrics, stats: Dict[str, Any]) -> str:
    """Assess overall risk level"""
    risk_score = 0
    
    # Check symmetry across all joints
    joint_pairs = [
        ('leftShoulder', 'rightShoulder'),
        ('leftElbow', 'rightElbow'),
        ('leftHip', 'rightHip'),
        ('leftKnee', 'rightKnee')
    ]
    
    for left, right in joint_pairs:
        left_values = [getattr(a, left) for a in metrics.joint_angles]
        right_values = [getattr(a, right) for a in metrics.joint_angles]
        symmetry = calculate_symmetry(left_values, right_values)
        
        if symmetry['percentage'] > 20:
            risk_score += 2
        elif symmetry['percentage'] > 10:
            risk_score += 1
    
    # Check task results
    if metrics.balance_results and metrics.balance_results.get('stabilityScore', 100) < 50:
        risk_score += 2
    
    if metrics.walk_results and metrics.walk_results.get('gaitSymmetry', 0) > 25:
        risk_score += 2
    
    # Determine risk level
    if risk_score >= 5:
        return "high"
    elif risk_score >= 3:
        return "moderate"
    else:
        return "low"

# ==================== API Routes ====================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "status": "healthy",
        "service": "Virtual Mirror API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "endpoints": {
            "health": "/health",
            "analyze": "/api/analyze",
            "report": "/api/report/{session_id}",
            "tts": "/api/tts"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected" if DATA_DIR.exists() else "error",
        "tts_available": GTTS_AVAILABLE
    }

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_session(metrics: SessionMetrics):
    """
    Analyze session metrics and generate summary
    
    Receives movement data, performs analysis, stores results, and returns summary
    """
    try:
        # Generate session ID if not provided
        session_id = metrics.session_id or str(uuid.uuid4())
        
        # Set session date if not provided
        if not metrics.session_date:
            metrics.session_date = datetime.now().isoformat()
        
        # Calculate statistics
        stats = calculate_summary_statistics(metrics.joint_angles)
        
        # Calculate symmetry metrics
        symmetry_analysis = {}
        joint_pairs = [
            ('leftShoulder', 'rightShoulder', 'shoulder'),
            ('leftElbow', 'rightElbow', 'elbow'),
            ('leftHip', 'rightHip', 'hip'),
            ('leftKnee', 'rightKnee', 'knee')
        ]
        
        for left, right, name in joint_pairs:
            left_values = [getattr(a, left) for a in metrics.joint_angles]
            right_values = [getattr(a, right) for a in metrics.joint_angles]
            symmetry_analysis[name] = calculate_symmetry(left_values, right_values)
        
        # Prepare data for advanced analysis module
        rom_data = {}
        if stats:
            for joint, joint_stats in stats.items():
                rom_data[joint] = joint_stats.get('range', 0)
        
        balance_data = {}
        if metrics.balance_results:
            balance_data = {
                'stability_score': metrics.balance_results.get('stabilityScore', 0),
                'single_leg_stance_time': metrics.balance_results.get('maxBalanceTime', 0) / 1000,  # Convert ms to s
                'sway_magnitude': metrics.balance_results.get('swayMagnitude', 0),
            }
        
        symmetry_data = {
            f"{name}_symmetry": sym['percentage']
            for name, sym in symmetry_analysis.items()
        }
        
        gait_data = {}
        if metrics.walk_results:
            gait_data = {
                'cadence': metrics.walk_results.get('cadence', 0),
                'step_length': metrics.walk_results.get('strideLength', 0),
            }
        
        # Perform comprehensive analysis using analysis module
        analysis_result = comprehensive_analysis(
            rom_data=rom_data if rom_data else None,
            balance_data=balance_data if balance_data else None,
            symmetry_data=symmetry_data if symmetry_data else None,
            gait_data=gait_data if gait_data else None,
            age=metrics.patient_age
        )
        
        # Use analysis module results
        recommendations = analysis_result.recommendations
        risk_level_map = {
            Classification.NORMAL: "low",
            Classification.BORDERLINE: "moderate",
            Classification.WEAKNESS_SUSPECTED: "high",
            Classification.INSUFFICIENT_DATA: "unknown"
        }
        risk_level = risk_level_map.get(analysis_result.classification, "unknown")
        
        # Add analysis module results to summary
        clinical_analysis = {
            'classification': analysis_result.classification.value,
            'confidence': analysis_result.confidence,
            'age_group': analysis_result.age_group,
            'flags': analysis_result.flags,
            'z_scores': analysis_result.z_scores,
            'detailed_metrics': analysis_result.metrics_analysis
        }
        
        # Create summary
        summary = {
            'session_id': session_id,
            'patient_name': metrics.patient_name,
            'patient_age': metrics.patient_age,
            'duration': metrics.duration,
            'data_points': len(metrics.joint_angles),
            'statistics': stats,
            'symmetry': symmetry_analysis,
            'task_results': {
                'raise_hand': metrics.raise_hand_results,
                'balance': metrics.balance_results,
                'walk': metrics.walk_results,
                'jump': metrics.jump_results
            },
            'clinical_analysis': clinical_analysis
        }
        
        # Store session data
        session_file = SESSIONS_DIR / f"{session_id}.json"
        with open(session_file, 'w') as f:
            json.dump({
                'metrics': metrics.dict(),
                'summary': summary,
                'recommendations': recommendations,
                'risk_level': risk_level,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        # Create analysis result
        result = AnalysisResult(
            session_id=session_id,
            summary=summary,
            recommendations=recommendations,
            risk_level=risk_level,
            timestamp=datetime.now().isoformat()
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/report/{session_id}")
async def get_report(session_id: str, background_tasks: BackgroundTasks):
    """
    Generate and return PDF report for a session
    
    Returns a downloadable PDF report with analysis results
    """
    try:
        # Load session data
        session_file = SESSIONS_DIR / f"{session_id}.json"
        if not session_file.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        with open(session_file, 'r') as f:
            session_data = json.load(f)
        
        # Generate PDF report
        report_path = REPORTS_DIR / f"report_{session_id}.pdf"
        generate_pdf_report(session_data, report_path)
        
        # Schedule cleanup after sending (optional)
        # background_tasks.add_task(cleanup_old_reports)
        
        return FileResponse(
            path=report_path,
            filename=f"movement_assessment_{session_id}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Generate speech audio from text using Google TTS
    
    Supports Arabic and English text-to-speech conversion
    """
    if not GTTS_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Google TTS not available. Install with: pip install gtts"
        )
    
    try:
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        audio_path = AUDIO_DIR / f"{audio_id}.mp3"
        
        # Generate speech
        tts = gTTS(text=request.text, lang=request.language, slow=request.slow)
        tts.save(str(audio_path))
        
        return FileResponse(
            path=audio_path,
            filename=f"speech_{audio_id}.mp3",
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# ==================== PDF Report Generation ====================

def generate_pdf_report(session_data: Dict[str, Any], output_path: Path):
    """Generate a comprehensive PDF report"""
    
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Container for PDF elements
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Title
    story.append(Paragraph("Movement Assessment Report", title_style))
    story.append(Spacer(1, 12))
    
    # Patient Information
    summary = session_data['summary']
    story.append(Paragraph("Patient Information", heading_style))
    
    patient_info = [
        ['Name:', summary.get('patient_name', 'Anonymous')],
        ['Age:', str(summary.get('patient_age', 'N/A'))],
        ['Session Date:', session_data.get('timestamp', 'N/A')[:10]],
        ['Session ID:', summary.get('session_id', 'N/A')],
        ['Duration:', f"{summary.get('duration', 0)} seconds"],
        ['Data Points:', str(summary.get('data_points', 0))]
    ]
    
    patient_table = Table(patient_info, colWidths=[2*inch, 4*inch])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(patient_table)
    story.append(Spacer(1, 20))
    
    # Risk Assessment
    story.append(Paragraph("Risk Assessment", heading_style))
    risk_level = session_data.get('risk_level', 'unknown').upper()
    risk_color = {
        'LOW': colors.green,
        'MODERATE': colors.orange,
        'HIGH': colors.red
    }.get(risk_level, colors.grey)
    
    risk_data = [['Risk Level:', risk_level]]
    risk_table = Table(risk_data, colWidths=[2*inch, 4*inch])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (1, 0), (1, 0), risk_color),
        ('TEXTCOLOR', (1, 0), (1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(risk_table)
    story.append(Spacer(1, 20))
    
    # Symmetry Analysis
    story.append(Paragraph("Symmetry Analysis", heading_style))
    
    symmetry = summary.get('symmetry', {})
    symmetry_data = [['Joint', 'Left Avg', 'Right Avg', 'Difference', 'Asymmetry %']]
    
    for joint, data in symmetry.items():
        symmetry_data.append([
            joint.capitalize(),
            f"{data.get('left_avg', 0):.1f}°",
            f"{data.get('right_avg', 0):.1f}°",
            f"{data.get('difference', 0):.1f}°",
            f"{data.get('percentage', 0):.1f}%"
        ])
    
    symmetry_table = Table(symmetry_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch, 1*inch])
    symmetry_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
    ]))
    
    story.append(symmetry_table)
    story.append(Spacer(1, 20))
    
    # Recommendations
    story.append(Paragraph("Recommendations", heading_style))
    
    recommendations = session_data.get('recommendations', [])
    for i, rec in enumerate(recommendations, 1):
        story.append(Paragraph(f"{i}. {rec}", styles['Normal']))
        story.append(Spacer(1, 6))
    
    story.append(Spacer(1, 20))
    
    # Footer
    story.append(Paragraph(
        "<i>This report is generated automatically and should be reviewed by a qualified healthcare professional.</i>",
        styles['Normal']
    ))
    
    # Build PDF
    doc.build(story)

# ==================== Cleanup Functions ====================

def cleanup_old_reports():
    """Remove reports older than 24 hours"""
    import time
    current_time = time.time()
    for report in REPORTS_DIR.glob("*.pdf"):
        if current_time - report.stat().st_mtime > 86400:  # 24 hours
            report.unlink()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
