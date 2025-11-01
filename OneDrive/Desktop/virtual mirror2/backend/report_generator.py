"""
PDF Report Generator for Virtual Mirror
========================================
Professional biomechanical assessment reports with charts and analysis.
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, 
    PageBreak, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderPDF

import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import io

# Color definitions
COLOR_PRIMARY = colors.HexColor('#1976d2')
COLOR_SUCCESS = colors.HexColor('#4caf50')
COLOR_WARNING = colors.HexColor('#ff9800')
COLOR_ERROR = colors.HexColor('#f44336')
COLOR_LIGHT_BG = colors.HexColor('#e3f2fd')
COLOR_GREY = colors.HexColor('#757575')


class ReportGenerator:
    """Professional PDF report generator with charts and analysis"""
    
    def __init__(self, output_path: Path, pagesize=A4):
        self.output_path = output_path
        self.pagesize = pagesize
        self.width, self.height = pagesize
        self.story = []
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=COLOR_PRIMARY,
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section heading
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=18,
            textColor=COLOR_PRIMARY,
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            borderWidth=2,
            borderColor=COLOR_PRIMARY,
            borderPadding=5,
            backColor=COLOR_LIGHT_BG
        ))
        
        # Subsection heading
        self.styles.add(ParagraphStyle(
            name='SubsectionHeading',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=COLOR_PRIMARY,
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Warning text
        self.styles.add(ParagraphStyle(
            name='WarningText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=COLOR_ERROR,
            fontName='Helvetica-Bold'
        ))
        
        # Success text
        self.styles.add(ParagraphStyle(
            name='SuccessText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=COLOR_SUCCESS,
            fontName='Helvetica-Bold'
        ))
        
    def add_header(self, title: str = "Movement Assessment Report"):
        """Add report header with logo and title"""
        
        # Title
        self.story.append(Paragraph(title, self.styles['ReportTitle']))
        self.story.append(Spacer(1, 0.3*inch))
        
        # Subtitle with date
        subtitle = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=COLOR_GREY,
            alignment=TA_CENTER
        )
        self.story.append(Paragraph(subtitle, subtitle_style))
        self.story.append(Spacer(1, 0.5*inch))
        
    def add_patient_info(self, patient_data: Dict[str, Any]):
        """Add patient information section"""
        
        self.story.append(Paragraph("Patient Information", self.styles['SectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Patient info table
        patient_info = [
            ['Patient Name:', patient_data.get('patient_name', 'Anonymous')],
            ['Age:', f"{patient_data.get('patient_age', 'N/A')} years"],
            ['Session Date:', patient_data.get('session_date', 'N/A')],
            ['Session ID:', patient_data.get('session_id', 'N/A')],
            ['Duration:', f"{patient_data.get('duration', 0)} seconds"],
            ['Data Points Collected:', str(patient_data.get('data_points', 0))]
        ]
        
        patient_table = Table(patient_info, colWidths=[2*inch, 4*inch])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), COLOR_LIGHT_BG),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, COLOR_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        
        self.story.append(patient_table)
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_risk_assessment(self, risk_level: str, classification: str, confidence: float):
        """Add risk assessment section with color coding"""
        
        self.story.append(Paragraph("Clinical Assessment", self.styles['SectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Determine colors based on risk
        risk_color_map = {
            'low': COLOR_SUCCESS,
            'moderate': COLOR_WARNING,
            'high': COLOR_ERROR,
            'unknown': COLOR_GREY
        }
        
        class_color_map = {
            'Normal': COLOR_SUCCESS,
            'Borderline': COLOR_WARNING,
            'Weakness suspected': COLOR_ERROR,
            'Insufficient data': COLOR_GREY
        }
        
        risk_color = risk_color_map.get(risk_level.lower(), COLOR_GREY)
        class_color = class_color_map.get(classification, COLOR_GREY)
        
        # Assessment table
        assessment_data = [
            ['Risk Level:', risk_level.upper()],
            ['Classification:', classification],
            ['Confidence:', f"{confidence}%"]
        ]
        
        assessment_table = Table(assessment_data, colWidths=[2*inch, 4*inch])
        assessment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), COLOR_LIGHT_BG),
            ('BACKGROUND', (1, 0), (1, 0), risk_color),
            ('BACKGROUND', (1, 1), (1, 1), class_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('TEXTCOLOR', (1, 0), (1, 1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1.5, COLOR_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        
        self.story.append(assessment_table)
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_symmetry_analysis(self, symmetry_data: Dict[str, Dict]):
        """Add symmetry analysis with highlighted abnormal values"""
        
        self.story.append(Paragraph("Bilateral Symmetry Analysis", self.styles['SectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Create symmetry table
        symmetry_rows = [['Joint', 'Left Avg', 'Right Avg', 'Difference', 'Asymmetry %', 'Status']]
        
        for joint, data in symmetry_data.items():
            left_avg = data.get('left_avg', 0)
            right_avg = data.get('right_avg', 0)
            difference = data.get('difference', 0)
            percentage = data.get('percentage', 0)
            
            # Determine status
            if percentage <= 5:
                status = '✓ Normal'
            elif percentage <= 10:
                status = '⚠ Borderline'
            else:
                status = '✗ Asymmetric'
            
            symmetry_rows.append([
                joint.capitalize(),
                f"{left_avg:.1f}°",
                f"{right_avg:.1f}°",
                f"{difference:.1f}°",
                f"{percentage:.1f}%",
                status
            ])
        
        symmetry_table = Table(symmetry_rows, colWidths=[1.2*inch, 0.9*inch, 0.9*inch, 1*inch, 1*inch, 1.2*inch])
        
        # Style with conditional formatting
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, COLOR_GREY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]
        
        # Highlight abnormal values in red
        for i, row in enumerate(symmetry_rows[1:], start=1):
            percentage = float(row[4].rstrip('%'))
            if percentage > 10:
                table_style.extend([
                    ('TEXTCOLOR', (4, i), (4, i), COLOR_ERROR),
                    ('FONTNAME', (4, i), (4, i), 'Helvetica-Bold'),
                    ('TEXTCOLOR', (5, i), (5, i), COLOR_ERROR),
                    ('FONTNAME', (5, i), (5, i), 'Helvetica-Bold')
                ])
            elif percentage > 5:
                table_style.extend([
                    ('TEXTCOLOR', (4, i), (5, i), COLOR_WARNING),
                    ('FONTNAME', (4, i), (5, i), 'Helvetica-Bold')
                ])
        
        symmetry_table.setStyle(TableStyle(table_style))
        self.story.append(symmetry_table)
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_task_results(self, task_results: Dict[str, Any]):
        """Add task-specific results"""
        
        self.story.append(Paragraph("Task Performance Results", self.styles['SectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Raise Hand Task
        if task_results.get('raise_hand'):
            self._add_raise_hand_results(task_results['raise_hand'])
        
        # Balance Task
        if task_results.get('balance'):
            self._add_balance_results(task_results['balance'])
        
        # Walk Task
        if task_results.get('walk'):
            self._add_walk_results(task_results['walk'])
        
        # Jump Task
        if task_results.get('jump'):
            self._add_jump_results(task_results['jump'])
            
    def _add_raise_hand_results(self, results: Dict):
        """Add raise hand task results"""
        
        self.story.append(Paragraph("Raise Hand Assessment", self.styles['SubsectionHeading']))
        
        data = [
            ['Metric', 'Value', 'Status'],
            ['Left Shoulder Max', f"{results.get('leftShoulderMax', 0):.1f}°", 
             '✓' if results.get('leftSuccess', False) else '✗'],
            ['Right Shoulder Max', f"{results.get('rightShoulderMax', 0):.1f}°", 
             '✓' if results.get('rightSuccess', False) else '✗'],
            ['Overall Success', 'Yes' if results.get('overallSuccess', False) else 'No',
             '✓' if results.get('overallSuccess', False) else '✗']
        ]
        
        table = self._create_result_table(data, results.get('overallSuccess', False))
        self.story.append(table)
        self.story.append(Spacer(1, 0.2*inch))
        
    def _add_balance_results(self, results: Dict):
        """Add balance task results"""
        
        self.story.append(Paragraph("Balance Assessment", self.styles['SubsectionHeading']))
        
        success = results.get('success', False)
        stability = results.get('stabilityScore', 0)
        
        data = [
            ['Metric', 'Value', 'Status'],
            ['Max Balance Time', f"{results.get('maxBalanceTime', 0)/1000:.1f}s", 
             '✓' if results.get('maxBalanceTime', 0) >= 5000 else '✗'],
            ['Stability Score', f"{stability:.1f}%",
             '✓' if stability >= 70 else '⚠' if stability >= 50 else '✗'],
            ['Balance Level', results.get('balanceLevel', 'Unknown'),
             '✓' if success else '✗'],
            ['Fall Count', str(results.get('fallCount', 0)),
             '✓' if results.get('fallCount', 0) <= 2 else '✗']
        ]
        
        table = self._create_result_table(data, success)
        self.story.append(table)
        self.story.append(Spacer(1, 0.2*inch))
        
    def _add_walk_results(self, results: Dict):
        """Add walk task results"""
        
        self.story.append(Paragraph("Gait Analysis", self.styles['SubsectionHeading']))
        
        success = results.get('success', False)
        symmetry = results.get('gaitSymmetry', 0)
        
        data = [
            ['Metric', 'Value', 'Status'],
            ['Total Steps', str(results.get('stepCount', 0)),
             '✓' if results.get('stepCount', 0) >= 10 else '✗'],
            ['Gait Symmetry', f"{symmetry:.1f}%",
             '✓' if symmetry < 10 else '⚠' if symmetry < 20 else '✗'],
            ['Cadence', f"{results.get('cadence', 0):.1f} steps/min",
             '✓'],
            ['Symmetry Level', results.get('symmetryLevel', 'Unknown'),
             '✓' if success else '✗']
        ]
        
        table = self._create_result_table(data, success)
        self.story.append(table)
        self.story.append(Spacer(1, 0.2*inch))
        
    def _add_jump_results(self, results: Dict):
        """Add jump task results"""
        
        self.story.append(Paragraph("Jump Assessment", self.styles['SubsectionHeading']))
        
        success = results.get('success', False)
        landing = results.get('landingControl', 0)
        
        data = [
            ['Metric', 'Value', 'Status'],
            ['Jump Count', str(results.get('jumpCount', 0)),
             '✓' if results.get('jumpCount', 0) >= 3 else '✗'],
            ['Max Jump Height', f"{results.get('maxJumpHeight', 0)*100:.1f} cm",
             '✓'],
            ['Landing Control', f"{landing:.1f}%",
             '✓' if landing >= 70 else '⚠' if landing >= 50 else '✗'],
            ['Landing Symmetry', f"{results.get('landingSymmetry', 0):.1f}%",
             '✓' if results.get('landingSymmetry', 0) >= 70 else '✗']
        ]
        
        table = self._create_result_table(data, success)
        self.story.append(table)
        self.story.append(Spacer(1, 0.2*inch))
        
    def _create_result_table(self, data: List[List], success: bool):
        """Create a styled result table with conditional formatting"""
        
        table = Table(data, colWidths=[2.5*inch, 2*inch, 1*inch])
        
        style = [
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_SUCCESS if success else COLOR_WARNING),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, COLOR_GREY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]
        
        # Highlight failed items
        for i, row in enumerate(data[1:], start=1):
            if row[2] == '✗':
                style.extend([
                    ('TEXTCOLOR', (1, i), (2, i), COLOR_ERROR),
                    ('FONTNAME', (1, i), (2, i), 'Helvetica-Bold')
                ])
            elif row[2] == '⚠':
                style.extend([
                    ('TEXTCOLOR', (1, i), (2, i), COLOR_WARNING),
                    ('FONTNAME', (1, i), (2, i), 'Helvetica-Bold')
                ])
        
        table.setStyle(TableStyle(style))
        return table
        
    def add_symmetry_chart(self, symmetry_data: Dict[str, Dict], temp_dir: Path):
        """Add bar chart showing symmetry analysis"""
        
        self.story.append(Paragraph("Symmetry Visualization", self.styles['SubsectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Create matplotlib chart
        joints = list(symmetry_data.keys())
        percentages = [data.get('percentage', 0) for data in symmetry_data.values()]
        
        fig, ax = plt.subplots(figsize=(8, 5))
        
        # Color bars based on threshold
        colors_list = []
        for pct in percentages:
            if pct <= 5:
                colors_list.append('#4caf50')  # Green
            elif pct <= 10:
                colors_list.append('#ff9800')  # Orange
            else:
                colors_list.append('#f44336')  # Red
        
        bars = ax.bar([j.capitalize() for j in joints], percentages, color=colors_list, edgecolor='black', linewidth=1.5)
        
        # Add threshold lines
        ax.axhline(y=5, color='green', linestyle='--', label='Normal Threshold (5%)', linewidth=2)
        ax.axhline(y=10, color='orange', linestyle='--', label='Borderline Threshold (10%)', linewidth=2)
        
        ax.set_ylabel('Asymmetry (%)', fontsize=12, fontweight='bold')
        ax.set_xlabel('Joint', fontsize=12, fontweight='bold')
        ax.set_title('Bilateral Symmetry Analysis', fontsize=14, fontweight='bold')
        ax.legend(loc='upper right')
        ax.grid(axis='y', alpha=0.3)
        
        # Add value labels on bars
        for bar, pct in zip(bars, percentages):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{pct:.1f}%', ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        
        # Save chart
        chart_path = temp_dir / "symmetry_chart.png"
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        # Add to PDF
        img = Image(str(chart_path), width=6*inch, height=3.75*inch)
        self.story.append(img)
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_rom_chart(self, rom_data: Dict[str, Dict], age_group: str, temp_dir: Path):
        """Add ROM comparison chart with normal ranges"""
        
        self.story.append(Paragraph("Range of Motion Analysis", self.styles['SubsectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Extract data
        joints = []
        values = []
        normal_mins = []
        normal_maxs = []
        
        for joint, data in rom_data.items():
            if 'individual_results' in data:
                for joint_name, result in data['individual_results'].items():
                    joints.append(joint_name.replace('_', ' ').title())
                    values.append(result.get('value', 0))
                    
                    # Parse normal range
                    norm_range = result.get('normal_range', '0-180°')
                    try:
                        min_val, max_val = norm_range.replace('°', '').split('-')
                        normal_mins.append(float(min_val))
                        normal_maxs.append(float(max_val))
                    except:
                        normal_mins.append(0)
                        normal_maxs.append(180)
        
        if not joints:
            return
        
        # Create chart
        fig, ax = plt.subplots(figsize=(10, 6))
        
        x = np.arange(len(joints))
        width = 0.6
        
        # Plot bars
        bars = ax.bar(x, values, width, label='Measured', edgecolor='black', linewidth=1.5)
        
        # Color code bars
        for i, (bar, val, min_norm, max_norm) in enumerate(zip(bars, values, normal_mins, normal_maxs)):
            if min_norm <= val <= max_norm:
                bar.set_color('#4caf50')  # Green - Normal
            elif val < min_norm:
                bar.set_color('#f44336')  # Red - Below normal
            else:
                bar.set_color('#ff9800')  # Orange - Above normal (rare for ROM)
        
        # Plot normal range as error bars
        ax.errorbar(x, [(min_val + max_val)/2 for min_val, max_val in zip(normal_mins, normal_maxs)],
                   yerr=[(max_val - min_val)/2 for min_val, max_val in zip(normal_mins, normal_maxs)],
                   fmt='none', ecolor='gray', elinewidth=2, capsize=5, capthick=2,
                   label='Normal Range', alpha=0.6)
        
        ax.set_ylabel('Angle (degrees)', fontsize=12, fontweight='bold')
        ax.set_xlabel('Joint', fontsize=12, fontweight='bold')
        ax.set_title(f'Range of Motion Comparison (Age Group: {age_group})', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(joints, rotation=45, ha='right')
        ax.legend()
        ax.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        
        # Save chart
        chart_path = temp_dir / "rom_chart.png"
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        # Add to PDF
        img = Image(str(chart_path), width=6.5*inch, height=3.9*inch)
        self.story.append(img)
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_recommendations(self, recommendations: List[str], flags: List[str]):
        """Add recommendations and flags section"""
        
        self.story.append(PageBreak())
        self.story.append(Paragraph("Clinical Recommendations", self.styles['SectionHeading']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Flags section
        if flags:
            self.story.append(Paragraph("⚠️ Areas of Concern", self.styles['SubsectionHeading']))
            for i, flag in enumerate(flags, 1):
                flag_style = self.styles['WarningText'] if '✗' in flag or 'Limited' in flag or 'Poor' in flag else self.styles['Normal']
                self.story.append(Paragraph(f"{i}. {flag}", flag_style))
                self.story.append(Spacer(1, 0.05*inch))
            self.story.append(Spacer(1, 0.2*inch))
        
        # Recommendations section
        self.story.append(Paragraph("📋 Recommendations", self.styles['SubsectionHeading']))
        for i, rec in enumerate(recommendations, 1):
            # Use appropriate style based on content
            if '⚠️' in rec or 'weakness' in rec.lower():
                rec_style = self.styles['WarningText']
            elif '✓' in rec or 'normal' in rec.lower():
                rec_style = self.styles['SuccessText']
            else:
                rec_style = self.styles['Normal']
            
            self.story.append(Paragraph(f"{i}. {rec}", rec_style))
            self.story.append(Spacer(1, 0.08*inch))
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_footer(self):
        """Add report footer with disclaimer"""
        
        self.story.append(Spacer(1, 0.5*inch))
        
        disclaimer = """
        <b>Important Disclaimer:</b><br/>
        This report is generated automatically based on movement analysis and should be used as a screening tool only. 
        It does not constitute a medical diagnosis. All results should be reviewed and interpreted by a qualified 
        healthcare professional, preferably a pediatric physical therapist or physician specializing in child development. 
        If concerns are raised, please seek professional medical evaluation.<br/><br/>
        <i>Virtual Mirror - Early Detection System v1.0</i><br/>
        <i>For professional use only</i>
        """
        
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=COLOR_GREY,
            alignment=TA_JUSTIFY,
            borderWidth=1,
            borderColor=COLOR_GREY,
            borderPadding=10,
            backColor=colors.HexColor('#f5f5f5')
        )
        
        self.story.append(Paragraph(disclaimer, disclaimer_style))
        
    def generate(self, session_data: Dict[str, Any], temp_dir: Optional[Path] = None):
        """Generate the complete PDF report"""
        
        # Create temp directory for charts if not provided
        if temp_dir is None:
            temp_dir = Path("temp_charts")
        temp_dir.mkdir(exist_ok=True)
        
        # Extract data
        summary = session_data.get('summary', {})
        clinical_analysis = summary.get('clinical_analysis', {})
        
        # Build report
        self.add_header()
        self.add_patient_info(summary)
        self.add_risk_assessment(
            session_data.get('risk_level', 'unknown'),
            clinical_analysis.get('classification', 'Unknown'),
            clinical_analysis.get('confidence', 0)
        )
        
        # Symmetry section
        if summary.get('symmetry'):
            self.add_symmetry_analysis(summary['symmetry'])
            self.add_symmetry_chart(summary['symmetry'], temp_dir)
        
        # ROM section
        if clinical_analysis.get('detailed_metrics', {}).get('rom'):
            self.add_rom_chart(
                clinical_analysis['detailed_metrics'],
                clinical_analysis.get('age_group', '8-10'),
                temp_dir
            )
        
        # Task results
        if summary.get('task_results'):
            self.add_task_results(summary['task_results'])
        
        # Recommendations
        self.add_recommendations(
            session_data.get('recommendations', []),
            clinical_analysis.get('flags', [])
        )
        
        # Footer
        self.add_footer()
        
        # Build PDF
        doc = SimpleDocTemplate(
            str(self.output_path),
            pagesize=self.pagesize,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch
        )
        
        doc.build(self.story)
        
        # Cleanup temp files (optional)
        # for file in temp_dir.glob("*.png"):
        #     file.unlink()
        
        return self.output_path


# ==================== Standalone Usage ====================

def generate_report(session_data: Dict[str, Any], output_path: Path) -> Path:
    """
    Convenience function to generate a report
    
    Args:
        session_data: Dictionary containing session information
        output_path: Path where PDF should be saved
    
    Returns:
        Path to generated PDF
    """
    generator = ReportGenerator(output_path)
    return generator.generate(session_data)


# ==================== Example Usage ====================

if __name__ == "__main__":
    # Example session data
    example_data = {
        "summary": {
            "session_id": "12345-abcde",
            "patient_name": "Test Patient",
            "patient_age": 9,
            "session_date": "2025-11-01",
            "duration": 120,
            "data_points": 500,
            "symmetry": {
                "shoulder": {"left_avg": 145, "right_avg": 150, "difference": 5, "percentage": 3.4},
                "elbow": {"left_avg": 140, "right_avg": 135, "difference": 5, "percentage": 3.6},
                "knee": {"left_avg": 130, "right_avg": 145, "difference": 15, "percentage": 10.9}
            },
            "task_results": {
                "raise_hand": {
                    "leftShoulderMax": 155,
                    "rightShoulderMax": 160,
                    "leftSuccess": True,
                    "rightSuccess": True,
                    "overallSuccess": True
                },
                "balance": {
                    "maxBalanceTime": 8500,
                    "stabilityScore": 75,
                    "balanceLevel": "good",
                    "fallCount": 1,
                    "success": True
                }
            },
            "clinical_analysis": {
                "classification": "Normal",
                "confidence": 92,
                "age_group": "8-10",
                "flags": [],
                "detailed_metrics": {}
            }
        },
        "risk_level": "low",
        "recommendations": [
            "Movement patterns appear normal.",
            "Continue regular physical activity."
        ]
    }
    
    output = Path("test_report.pdf")
    generate_report(example_data, output)
    print(f"Report generated: {output}")
