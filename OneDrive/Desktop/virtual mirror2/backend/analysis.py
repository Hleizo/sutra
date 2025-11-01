"""
Analysis Module for Virtual Mirror
===================================
Biomechanical analysis with age-based normative data and classification.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class Classification(str, Enum):
    """Movement classification categories"""
    NORMAL = "Normal"
    BORDERLINE = "Borderline"
    WEAKNESS_SUSPECTED = "Weakness suspected"
    INSUFFICIENT_DATA = "Insufficient data"


@dataclass
class NormativeRange:
    """Normative range with age-specific values"""
    mean: float
    std_dev: float
    min_normal: float
    max_normal: float
    
    def is_within_normal(self, value: float) -> bool:
        """Check if value is within normal range"""
        return self.min_normal <= value <= self.max_normal
    
    def get_z_score(self, value: float) -> float:
        """Calculate z-score (standard deviations from mean)"""
        if self.std_dev == 0:
            return 0.0
        return (value - self.mean) / self.std_dev


@dataclass
class AnalysisResult:
    """Complete analysis result"""
    classification: Classification
    confidence: float  # 0-100
    metrics_analysis: Dict[str, Dict]
    age_group: str
    recommendations: List[str]
    flags: List[str]
    z_scores: Dict[str, float]


# ==================== Normative Data ====================

# Age-based normative ranges for joint ROM (degrees)
# Based on pediatric biomechanics literature
ROM_NORMATIVE_DATA = {
    # Ages 5-7
    "5-7": {
        "shoulder_flexion": NormativeRange(mean=165, std_dev=10, min_normal=145, max_normal=180),
        "shoulder_abduction": NormativeRange(mean=165, std_dev=10, min_normal=145, max_normal=180),
        "elbow_flexion": NormativeRange(mean=145, std_dev=8, min_normal=130, max_normal=160),
        "hip_flexion": NormativeRange(mean=120, std_dev=10, min_normal=100, max_normal=140),
        "knee_flexion": NormativeRange(mean=135, std_dev=8, min_normal=120, max_normal=150),
        "knee_extension": NormativeRange(mean=0, std_dev=3, min_normal=-5, max_normal=5),
    },
    # Ages 8-10
    "8-10": {
        "shoulder_flexion": NormativeRange(mean=168, std_dev=9, min_normal=150, max_normal=180),
        "shoulder_abduction": NormativeRange(mean=168, std_dev=9, min_normal=150, max_normal=180),
        "elbow_flexion": NormativeRange(mean=147, std_dev=7, min_normal=133, max_normal=160),
        "hip_flexion": NormativeRange(mean=122, std_dev=9, min_normal=105, max_normal=140),
        "knee_flexion": NormativeRange(mean=137, std_dev=7, min_normal=123, max_normal=150),
        "knee_extension": NormativeRange(mean=0, std_dev=3, min_normal=-5, max_normal=5),
    },
    # Ages 11-13
    "11-13": {
        "shoulder_flexion": NormativeRange(mean=170, std_dev=8, min_normal=154, max_normal=180),
        "shoulder_abduction": NormativeRange(mean=170, std_dev=8, min_normal=154, max_normal=180),
        "elbow_flexion": NormativeRange(mean=148, std_dev=6, min_normal=136, max_normal=160),
        "hip_flexion": NormativeRange(mean=124, std_dev=8, min_normal=108, max_normal=140),
        "knee_flexion": NormativeRange(mean=138, std_dev=6, min_normal=126, max_normal=150),
        "knee_extension": NormativeRange(mean=0, std_dev=2, min_normal=-3, max_normal=3),
    },
}

# Balance normative data (stability scores)
BALANCE_NORMATIVE_DATA = {
    "5-7": {
        "single_leg_stance_time": NormativeRange(mean=8.5, std_dev=3.0, min_normal=3.0, max_normal=15.0),
        "stability_score": NormativeRange(mean=65, std_dev=15, min_normal=40, max_normal=90),
        "sway_magnitude": NormativeRange(mean=0.015, std_dev=0.008, min_normal=0.005, max_normal=0.030),
    },
    "8-10": {
        "single_leg_stance_time": NormativeRange(mean=12.0, std_dev=4.0, min_normal=5.0, max_normal=20.0),
        "stability_score": NormativeRange(mean=72, std_dev=12, min_normal=50, max_normal=95),
        "sway_magnitude": NormativeRange(mean=0.012, std_dev=0.006, min_normal=0.004, max_normal=0.025),
    },
    "11-13": {
        "single_leg_stance_time": NormativeRange(mean=15.0, std_dev=5.0, min_normal=7.0, max_normal=25.0),
        "stability_score": NormativeRange(mean=78, std_dev=10, min_normal=60, max_normal=98),
        "sway_magnitude": NormativeRange(mean=0.010, std_dev=0.005, min_normal=0.003, max_normal=0.020),
    },
}

# Symmetry normative data (percentage difference between sides)
SYMMETRY_NORMATIVE_DATA = {
    "all_ages": {
        "shoulder_symmetry": NormativeRange(mean=3.0, std_dev=2.5, min_normal=0.0, max_normal=8.0),
        "elbow_symmetry": NormativeRange(mean=2.5, std_dev=2.0, min_normal=0.0, max_normal=7.0),
        "hip_symmetry": NormativeRange(mean=3.5, std_dev=2.5, min_normal=0.0, max_normal=9.0),
        "knee_symmetry": NormativeRange(mean=3.0, std_dev=2.0, min_normal=0.0, max_normal=8.0),
        "gait_symmetry": NormativeRange(mean=5.0, std_dev=3.0, min_normal=0.0, max_normal=12.0),
    }
}

# Gait parameters normative data
GAIT_NORMATIVE_DATA = {
    "5-7": {
        "cadence": NormativeRange(mean=165, std_dev=15, min_normal=140, max_normal=190),  # steps/min
        "step_length": NormativeRange(mean=0.45, std_dev=0.08, min_normal=0.30, max_normal=0.60),  # meters
        "stride_time": NormativeRange(mean=0.73, std_dev=0.08, min_normal=0.60, max_normal=0.90),  # seconds
    },
    "8-10": {
        "cadence": NormativeRange(mean=155, std_dev=12, min_normal=135, max_normal=180),
        "step_length": NormativeRange(mean=0.52, std_dev=0.10, min_normal=0.35, max_normal=0.70),
        "stride_time": NormativeRange(mean=0.77, std_dev=0.07, min_normal=0.65, max_normal=0.92),
    },
    "11-13": {
        "cadence": NormativeRange(mean=145, std_dev=10, min_normal=130, max_normal=165),
        "step_length": NormativeRange(mean=0.60, std_dev=0.12, min_normal=0.40, max_normal=0.80),
        "stride_time": NormativeRange(mean=0.83, std_dev=0.06, min_normal=0.70, max_normal=0.98),
    },
}


# ==================== Helper Functions ====================

def get_age_group(age: Optional[int]) -> str:
    """Determine age group for normative data lookup"""
    if age is None:
        return "8-10"  # Default to middle group
    
    if age <= 7:
        return "5-7"
    elif age <= 10:
        return "8-10"
    else:
        return "11-13"


def classify_metric(value: float, norm_range: NormativeRange) -> Tuple[Classification, float]:
    """
    Classify a single metric value
    
    Returns:
        (Classification, confidence_score)
    """
    z_score = abs(norm_range.get_z_score(value))
    
    if norm_range.is_within_normal(value):
        # Within 1 standard deviation = normal
        if z_score <= 1.0:
            return Classification.NORMAL, 95.0
        # Within normal range but >1 SD = still normal but lower confidence
        else:
            return Classification.NORMAL, 80.0
    
    # Outside normal range
    if z_score <= 2.0:
        # Within 2 SDs = borderline
        return Classification.BORDERLINE, 70.0
    else:
        # Beyond 2 SDs = weakness suspected
        return Classification.WEAKNESS_SUSPECTED, 85.0


def aggregate_classifications(classifications: List[Tuple[Classification, float]]) -> Tuple[Classification, float]:
    """
    Aggregate multiple classifications into overall result
    Uses weighted voting based on confidence scores
    """
    if not classifications:
        return Classification.INSUFFICIENT_DATA, 0.0
    
    # Count occurrences with confidence weighting
    weighted_counts = {
        Classification.NORMAL: 0.0,
        Classification.BORDERLINE: 0.0,
        Classification.WEAKNESS_SUSPECTED: 0.0,
    }
    
    total_weight = 0.0
    for classification, confidence in classifications:
        if classification in weighted_counts:
            weight = confidence / 100.0
            weighted_counts[classification] += weight
            total_weight += weight
    
    if total_weight == 0:
        return Classification.INSUFFICIENT_DATA, 0.0
    
    # Normalize
    for key in weighted_counts:
        weighted_counts[key] /= total_weight
    
    # Determine overall classification
    # If >30% weakness suspected = weakness suspected
    if weighted_counts[Classification.WEAKNESS_SUSPECTED] > 0.30:
        confidence = weighted_counts[Classification.WEAKNESS_SUSPECTED] * 100
        return Classification.WEAKNESS_SUSPECTED, confidence
    
    # If >40% borderline (and not weakness) = borderline
    if weighted_counts[Classification.BORDERLINE] > 0.40:
        confidence = weighted_counts[Classification.BORDERLINE] * 100
        return Classification.BORDERLINE, confidence
    
    # Otherwise normal
    confidence = weighted_counts[Classification.NORMAL] * 100
    return Classification.NORMAL, confidence


# ==================== Main Analysis Functions ====================

def analyze_rom(
    joint_data: Dict[str, float],
    age: Optional[int] = None
) -> Dict[str, any]:
    """
    Analyze Range of Motion data
    
    Args:
        joint_data: Dictionary with joint names and ROM values (degrees)
        age: Patient age for normative comparison
    
    Returns:
        Dictionary with analysis results
    """
    age_group = get_age_group(age)
    normative_data = ROM_NORMATIVE_DATA.get(age_group, ROM_NORMATIVE_DATA["8-10"])
    
    results = {}
    classifications = []
    z_scores = {}
    flags = []
    
    for joint, value in joint_data.items():
        # Map joint names to normative data keys
        joint_key = joint.lower().replace("_", " ")
        
        # Try to find matching normative data
        norm_range = None
        for key, norm in normative_data.items():
            if key.replace("_", " ") in joint_key or joint_key in key.replace("_", " "):
                norm_range = norm
                break
        
        if norm_range:
            classification, confidence = classify_metric(value, norm_range)
            z_score = norm_range.get_z_score(value)
            
            results[joint] = {
                "value": value,
                "classification": classification.value,
                "confidence": confidence,
                "z_score": z_score,
                "normal_range": f"{norm_range.min_normal}-{norm_range.max_normal}°",
                "mean": norm_range.mean
            }
            
            classifications.append((classification, confidence))
            z_scores[joint] = z_score
            
            # Flag concerns
            if classification == Classification.WEAKNESS_SUSPECTED:
                flags.append(f"Limited ROM in {joint}: {value:.1f}° (normal: {norm_range.min_normal}-{norm_range.max_normal}°)")
            elif classification == Classification.BORDERLINE:
                flags.append(f"Borderline ROM in {joint}: {value:.1f}°")
    
    # Overall classification
    overall_classification, overall_confidence = aggregate_classifications(classifications)
    
    return {
        "overall_classification": overall_classification.value,
        "confidence": round(overall_confidence, 1),
        "individual_results": results,
        "z_scores": z_scores,
        "flags": flags,
        "age_group": age_group
    }


def analyze_balance(
    balance_data: Dict[str, float],
    age: Optional[int] = None
) -> Dict[str, any]:
    """
    Analyze balance and stability data
    
    Args:
        balance_data: Dictionary with balance metrics
        age: Patient age for normative comparison
    
    Returns:
        Dictionary with analysis results
    """
    age_group = get_age_group(age)
    normative_data = BALANCE_NORMATIVE_DATA.get(age_group, BALANCE_NORMATIVE_DATA["8-10"])
    
    results = {}
    classifications = []
    z_scores = {}
    flags = []
    
    for metric, value in balance_data.items():
        metric_key = metric.lower().replace(" ", "_")
        
        if metric_key in normative_data:
            norm_range = normative_data[metric_key]
            classification, confidence = classify_metric(value, norm_range)
            z_score = norm_range.get_z_score(value)
            
            results[metric] = {
                "value": value,
                "classification": classification.value,
                "confidence": confidence,
                "z_score": z_score,
                "normal_range": f"{norm_range.min_normal}-{norm_range.max_normal}",
                "mean": norm_range.mean
            }
            
            classifications.append((classification, confidence))
            z_scores[metric] = z_score
            
            # Flag concerns
            if classification == Classification.WEAKNESS_SUSPECTED:
                flags.append(f"Poor balance: {metric} = {value:.1f} (normal: >{norm_range.min_normal})")
            elif classification == Classification.BORDERLINE:
                flags.append(f"Borderline balance: {metric} = {value:.1f}")
    
    overall_classification, overall_confidence = aggregate_classifications(classifications)
    
    return {
        "overall_classification": overall_classification.value,
        "confidence": round(overall_confidence, 1),
        "individual_results": results,
        "z_scores": z_scores,
        "flags": flags,
        "age_group": age_group
    }


def analyze_symmetry(
    symmetry_data: Dict[str, float],
    age: Optional[int] = None
) -> Dict[str, any]:
    """
    Analyze bilateral symmetry data
    
    Args:
        symmetry_data: Dictionary with symmetry percentages (% difference)
        age: Patient age (not used for symmetry, but kept for consistency)
    
    Returns:
        Dictionary with analysis results
    """
    normative_data = SYMMETRY_NORMATIVE_DATA["all_ages"]
    
    results = {}
    classifications = []
    z_scores = {}
    flags = []
    
    for metric, value in symmetry_data.items():
        metric_key = metric.lower().replace(" ", "_")
        
        # Find matching normative data
        norm_range = None
        for key, norm in normative_data.items():
            if metric_key in key or key in metric_key:
                norm_range = norm
                break
        
        if norm_range:
            classification, confidence = classify_metric(value, norm_range)
            z_score = norm_range.get_z_score(value)
            
            results[metric] = {
                "value": value,
                "classification": classification.value,
                "confidence": confidence,
                "z_score": z_score,
                "normal_range": f"<{norm_range.max_normal}%",
                "mean": norm_range.mean
            }
            
            classifications.append((classification, confidence))
            z_scores[metric] = z_score
            
            # Flag concerns (asymmetry is concerning)
            if classification == Classification.WEAKNESS_SUSPECTED:
                flags.append(f"Significant asymmetry in {metric}: {value:.1f}% (normal: <{norm_range.max_normal}%)")
            elif classification == Classification.BORDERLINE:
                flags.append(f"Borderline asymmetry in {metric}: {value:.1f}%")
    
    overall_classification, overall_confidence = aggregate_classifications(classifications)
    
    return {
        "overall_classification": overall_classification.value,
        "confidence": round(overall_confidence, 1),
        "individual_results": results,
        "z_scores": z_scores,
        "flags": flags
    }


def analyze_gait(
    gait_data: Dict[str, float],
    age: Optional[int] = None
) -> Dict[str, any]:
    """
    Analyze gait parameters
    
    Args:
        gait_data: Dictionary with gait metrics
        age: Patient age for normative comparison
    
    Returns:
        Dictionary with analysis results
    """
    age_group = get_age_group(age)
    normative_data = GAIT_NORMATIVE_DATA.get(age_group, GAIT_NORMATIVE_DATA["8-10"])
    
    results = {}
    classifications = []
    z_scores = {}
    flags = []
    
    for metric, value in gait_data.items():
        metric_key = metric.lower().replace(" ", "_")
        
        if metric_key in normative_data:
            norm_range = normative_data[metric_key]
            classification, confidence = classify_metric(value, norm_range)
            z_score = norm_range.get_z_score(value)
            
            results[metric] = {
                "value": value,
                "classification": classification.value,
                "confidence": confidence,
                "z_score": z_score,
                "normal_range": f"{norm_range.min_normal}-{norm_range.max_normal}",
                "mean": norm_range.mean
            }
            
            classifications.append((classification, confidence))
            z_scores[metric] = z_score
            
            if classification == Classification.WEAKNESS_SUSPECTED:
                flags.append(f"Abnormal gait: {metric} = {value:.2f}")
            elif classification == Classification.BORDERLINE:
                flags.append(f"Borderline gait: {metric} = {value:.2f}")
    
    overall_classification, overall_confidence = aggregate_classifications(classifications)
    
    return {
        "overall_classification": overall_classification.value,
        "confidence": round(overall_confidence, 1),
        "individual_results": results,
        "z_scores": z_scores,
        "flags": flags,
        "age_group": age_group
    }


def comprehensive_analysis(
    rom_data: Optional[Dict[str, float]] = None,
    balance_data: Optional[Dict[str, float]] = None,
    symmetry_data: Optional[Dict[str, float]] = None,
    gait_data: Optional[Dict[str, float]] = None,
    age: Optional[int] = None
) -> AnalysisResult:
    """
    Perform comprehensive analysis across all domains
    
    Args:
        rom_data: Range of motion measurements
        balance_data: Balance and stability measurements
        symmetry_data: Bilateral symmetry measurements
        gait_data: Gait parameters
        age: Patient age
    
    Returns:
        AnalysisResult with comprehensive classification
    """
    age_group = get_age_group(age)
    all_classifications = []
    all_flags = []
    all_z_scores = {}
    metrics_analysis = {}
    
    # Analyze each domain
    if rom_data:
        rom_analysis = analyze_rom(rom_data, age)
        metrics_analysis["rom"] = rom_analysis
        all_flags.extend(rom_analysis["flags"])
        all_z_scores.update({f"rom_{k}": v for k, v in rom_analysis["z_scores"].items()})
        
        # Extract classification
        if rom_analysis["overall_classification"] != Classification.INSUFFICIENT_DATA.value:
            all_classifications.append((
                Classification(rom_analysis["overall_classification"]),
                rom_analysis["confidence"]
            ))
    
    if balance_data:
        balance_analysis = analyze_balance(balance_data, age)
        metrics_analysis["balance"] = balance_analysis
        all_flags.extend(balance_analysis["flags"])
        all_z_scores.update({f"balance_{k}": v for k, v in balance_analysis["z_scores"].items()})
        
        if balance_analysis["overall_classification"] != Classification.INSUFFICIENT_DATA.value:
            all_classifications.append((
                Classification(balance_analysis["overall_classification"]),
                balance_analysis["confidence"]
            ))
    
    if symmetry_data:
        symmetry_analysis = analyze_symmetry(symmetry_data, age)
        metrics_analysis["symmetry"] = symmetry_analysis
        all_flags.extend(symmetry_analysis["flags"])
        all_z_scores.update({f"symmetry_{k}": v for k, v in symmetry_analysis["z_scores"].items()})
        
        if symmetry_analysis["overall_classification"] != Classification.INSUFFICIENT_DATA.value:
            all_classifications.append((
                Classification(symmetry_analysis["overall_classification"]),
                symmetry_analysis["confidence"]
            ))
    
    if gait_data:
        gait_analysis = analyze_gait(gait_data, age)
        metrics_analysis["gait"] = gait_analysis
        all_flags.extend(gait_analysis["flags"])
        all_z_scores.update({f"gait_{k}": v for k, v in gait_analysis["z_scores"].items()})
        
        if gait_analysis["overall_classification"] != Classification.INSUFFICIENT_DATA.value:
            all_classifications.append((
                Classification(gait_analysis["overall_classification"]),
                gait_analysis["confidence"]
            ))
    
    # Overall classification
    overall_classification, overall_confidence = aggregate_classifications(all_classifications)
    
    # Generate recommendations
    recommendations = generate_recommendations(
        overall_classification,
        all_flags,
        metrics_analysis
    )
    
    return AnalysisResult(
        classification=overall_classification,
        confidence=round(overall_confidence, 1),
        metrics_analysis=metrics_analysis,
        age_group=age_group,
        recommendations=recommendations,
        flags=all_flags,
        z_scores=all_z_scores
    )


def generate_recommendations(
    classification: Classification,
    flags: List[str],
    metrics_analysis: Dict
) -> List[str]:
    """Generate specific recommendations based on analysis"""
    recommendations = []
    
    if classification == Classification.NORMAL:
        recommendations.append("Movement patterns are within normal limits for age group.")
        recommendations.append("Continue regular physical activity and sports participation.")
        recommendations.append("Annual screening recommended for monitoring development.")
    
    elif classification == Classification.BORDERLINE:
        recommendations.append("Some movement patterns show borderline values.")
        recommendations.append("Follow-up assessment in 3-6 months recommended.")
        recommendations.append("Consider targeted exercises for areas of concern:")
        
        # Specific recommendations based on flags
        if any("ROM" in flag or "range" in flag.lower() for flag in flags):
            recommendations.append("  - Stretching and flexibility exercises")
        if any("balance" in flag.lower() for flag in flags):
            recommendations.append("  - Balance training (single-leg stance, proprioception exercises)")
        if any("asymmetry" in flag.lower() or "symmetry" in flag.lower() for flag in flags):
            recommendations.append("  - Bilateral strengthening exercises")
        if any("gait" in flag.lower() for flag in flags):
            recommendations.append("  - Gait training and walking exercises")
    
    elif classification == Classification.WEAKNESS_SUSPECTED:
        recommendations.append("⚠️ Movement patterns suggest possible motor weakness.")
        recommendations.append("Professional evaluation by pediatric physical therapist recommended.")
        recommendations.append("Comprehensive clinical assessment advised within 2-4 weeks.")
        recommendations.append("Specific areas of concern:")
        
        # List specific concerns
        for flag in flags[:5]:  # Limit to top 5 flags
            recommendations.append(f"  - {flag}")
    
    return recommendations


# ==================== Example Usage ====================

if __name__ == "__main__":
    # Example data
    rom_data = {
        "shoulder_flexion_left": 140,
        "shoulder_flexion_right": 145,
        "elbow_flexion_left": 130,
        "elbow_flexion_right": 135,
        "knee_flexion_left": 125,
        "knee_flexion_right": 128,
    }
    
    balance_data = {
        "stability_score": 55,
        "single_leg_stance_time": 4.5,
        "sway_magnitude": 0.022,
    }
    
    symmetry_data = {
        "shoulder_symmetry": 3.5,
        "elbow_symmetry": 3.8,
        "knee_symmetry": 2.4,
    }
    
    gait_data = {
        "cadence": 150,
        "step_length": 0.48,
        "stride_time": 0.80,
    }
    
    # Perform analysis
    result = comprehensive_analysis(
        rom_data=rom_data,
        balance_data=balance_data,
        symmetry_data=symmetry_data,
        gait_data=gait_data,
        age=9
    )
    
    print(f"Classification: {result.classification.value}")
    print(f"Confidence: {result.confidence}%")
    print(f"Age Group: {result.age_group}")
    print(f"\nFlags: {len(result.flags)}")
    for flag in result.flags:
        print(f"  - {flag}")
    print(f"\nRecommendations:")
    for rec in result.recommendations:
        print(f"  {rec}")
