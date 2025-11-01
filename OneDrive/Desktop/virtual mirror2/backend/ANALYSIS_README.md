# Analysis Module Documentation

## Overview

The `analysis.py` module provides age-based biomechanical analysis with normative data comparison for early detection of motor weakness in children.

## Features

### 1. **Age-Based Normative Ranges**
- Three age groups: 5-7, 8-10, 11-13 years
- Based on pediatric biomechanics literature
- Includes mean, standard deviation, and normal ranges

### 2. **Multiple Analysis Domains**
- **Range of Motion (ROM)**: Joint flexibility analysis
- **Balance & Stability**: Postural control assessment
- **Bilateral Symmetry**: Left/right side comparison
- **Gait Parameters**: Walking pattern analysis

### 3. **Statistical Classification**
- **Normal**: Within expected range (Z-score ≤ 1.0 SD)
- **Borderline**: Outside normal but within 2 SD
- **Weakness Suspected**: Beyond 2 SD from mean
- Confidence scoring (0-100%)

### 4. **Automated Recommendations**
- Personalized based on findings
- Specific exercise suggestions
- Follow-up timing guidance

## Usage

### Basic Example

```python
from analysis import comprehensive_analysis

# Prepare metrics
rom_data = {
    "shoulder_flexion": 155,
    "elbow_flexion": 140,
    "knee_flexion": 130
}

balance_data = {
    "stability_score": 68,
    "single_leg_stance_time": 10.5
}

symmetry_data = {
    "shoulder_symmetry": 4.5,
    "knee_symmetry": 3.2
}

# Perform analysis
result = comprehensive_analysis(
    rom_data=rom_data,
    balance_data=balance_data,
    symmetry_data=symmetry_data,
    age=9
)

# Access results
print(f"Classification: {result.classification.value}")
print(f"Confidence: {result.confidence}%")
for recommendation in result.recommendations:
    print(f"- {recommendation}")
```

### Individual Domain Analysis

```python
from analysis import analyze_rom, analyze_balance, analyze_symmetry, analyze_gait

# Analyze ROM only
rom_result = analyze_rom({"shoulder_flexion": 160}, age=8)

# Analyze balance only
balance_result = analyze_balance({"stability_score": 75}, age=8)

# Analyze symmetry only
symmetry_result = analyze_symmetry({"shoulder_symmetry": 5.0}, age=8)

# Analyze gait only
gait_result = analyze_gait({"cadence": 155}, age=8)
```

## Normative Data

### Range of Motion (degrees)

| Joint | 5-7 years | 8-10 years | 11-13 years |
|-------|-----------|------------|-------------|
| Shoulder Flexion | 145-180 | 150-180 | 154-180 |
| Elbow Flexion | 130-160 | 133-160 | 136-160 |
| Hip Flexion | 100-140 | 105-140 | 108-140 |
| Knee Flexion | 120-150 | 123-150 | 126-150 |

### Balance Metrics

| Metric | 5-7 years | 8-10 years | 11-13 years |
|--------|-----------|------------|-------------|
| Stability Score | 40-90 | 50-95 | 60-98 |
| Single Leg Time (s) | 3-15 | 5-20 | 7-25 |
| Sway Magnitude | 0.005-0.030 | 0.004-0.025 | 0.003-0.020 |

### Symmetry (% difference)

| Metric | All Ages |
|--------|----------|
| Shoulder | <8% |
| Elbow | <7% |
| Hip | <9% |
| Knee | <8% |
| Gait | <12% |

### Gait Parameters

| Metric | 5-7 years | 8-10 years | 11-13 years |
|--------|-----------|------------|-------------|
| Cadence (steps/min) | 140-190 | 135-180 | 130-165 |
| Step Length (m) | 0.30-0.60 | 0.35-0.70 | 0.40-0.80 |

## Classification Logic

### Z-Score Based Classification

```
Z-Score = (Value - Mean) / Standard Deviation

Classification:
- Normal: |Z| ≤ 1.0 (within 1 SD)
- Borderline: 1.0 < |Z| ≤ 2.0 (1-2 SD from mean)
- Weakness Suspected: |Z| > 2.0 (beyond 2 SD)
```

### Aggregate Classification

When analyzing multiple metrics:
1. Each metric classified individually
2. Weighted by confidence score
3. Overall classification determined by:
   - >30% weakness → **Weakness Suspected**
   - >40% borderline → **Borderline**
   - Otherwise → **Normal**

## API Integration

The module is integrated into FastAPI's `/api/analyze` endpoint:

```python
# In main.py
from analysis import comprehensive_analysis, Classification

# Inside analyze_session endpoint
analysis_result = comprehensive_analysis(
    rom_data=rom_data,
    balance_data=balance_data,
    symmetry_data=symmetry_data,
    gait_data=gait_data,
    age=patient_age
)

# Map to risk level
risk_level_map = {
    Classification.NORMAL: "low",
    Classification.BORDERLINE: "moderate",
    Classification.WEAKNESS_SUSPECTED: "high"
}
```

## Testing

Run the test suite:

```bash
cd backend
python test_analysis.py
```

The test suite includes:
- Normal movement patterns
- Borderline cases
- Suspected weakness cases
- Individual domain tests
- Age group comparisons

## Data Structures

### Input Data Format

```python
# ROM data (degrees)
rom_data = {
    "shoulder_flexion": float,
    "elbow_flexion": float,
    "hip_flexion": float,
    "knee_flexion": float
}

# Balance data
balance_data = {
    "stability_score": float,  # 0-100
    "single_leg_stance_time": float,  # seconds
    "sway_magnitude": float  # normalized
}

# Symmetry data (% difference)
symmetry_data = {
    "shoulder_symmetry": float,
    "elbow_symmetry": float,
    "hip_symmetry": float,
    "knee_symmetry": float
}

# Gait data
gait_data = {
    "cadence": float,  # steps/minute
    "step_length": float,  # meters
    "stride_time": float  # seconds
}
```

### Output Data Structure

```python
@dataclass
class AnalysisResult:
    classification: Classification  # Enum: NORMAL, BORDERLINE, WEAKNESS_SUSPECTED
    confidence: float  # 0-100
    metrics_analysis: Dict[str, Dict]  # Detailed per-domain results
    age_group: str  # "5-7", "8-10", "11-13"
    recommendations: List[str]  # Personalized recommendations
    flags: List[str]  # Warning flags
    z_scores: Dict[str, float]  # Z-scores for all metrics
```

## Scientific Basis

The normative ranges are based on:
- Pediatric biomechanics literature
- Age-specific developmental milestones
- Clinical practice guidelines
- Population-based studies

**Note**: This is a screening tool. Clinical diagnosis should be performed by qualified healthcare professionals.

## Dependencies

```
numpy>=1.26.4
pandas>=2.2.3
```

## Future Enhancements

- [ ] Add gender-specific norms
- [ ] Include ethnic/regional variations
- [ ] Machine learning classification
- [ ] Longitudinal tracking
- [ ] Movement disorder pattern recognition
- [ ] Integration with wearable sensors

## References

1. Pediatric Biomechanics Research Studies
2. World Health Organization Growth Standards
3. Clinical Movement Analysis Literature
4. Pediatric Physical Therapy Guidelines

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**License**: MIT
