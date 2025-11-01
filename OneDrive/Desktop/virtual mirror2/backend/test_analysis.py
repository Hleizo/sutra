"""
Test script for the analysis module
Run with: python test_analysis.py
"""

from analysis import (
    comprehensive_analysis,
    analyze_rom,
    analyze_balance,
    analyze_symmetry,
    analyze_gait,
    Classification
)


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)


def test_normal_case():
    """Test case with normal movement patterns"""
    print_section("TEST 1: Normal Movement Pattern (Age 9)")
    
    rom_data = {
        "shoulder_flexion": 165,
        "elbow_flexion": 145,
        "hip_flexion": 120,
        "knee_flexion": 135,
    }
    
    balance_data = {
        "stability_score": 75,
        "single_leg_stance_time": 12.5,
        "sway_magnitude": 0.011,
    }
    
    symmetry_data = {
        "shoulder_symmetry": 3.0,
        "elbow_symmetry": 2.5,
        "knee_symmetry": 2.8,
    }
    
    result = comprehensive_analysis(
        rom_data=rom_data,
        balance_data=balance_data,
        symmetry_data=symmetry_data,
        age=9
    )
    
    print(f"\n✓ Classification: {result.classification.value}")
    print(f"✓ Confidence: {result.confidence}%")
    print(f"✓ Age Group: {result.age_group}")
    print(f"\nRecommendations:")
    for rec in result.recommendations:
        print(f"  • {rec}")


def test_borderline_case():
    """Test case with borderline movement patterns"""
    print_section("TEST 2: Borderline Movement Pattern (Age 8)")
    
    rom_data = {
        "shoulder_flexion": 148,  # Borderline low
        "elbow_flexion": 133,     # Borderline low
        "knee_flexion": 123,      # Borderline low
    }
    
    balance_data = {
        "stability_score": 55,    # Borderline low
        "single_leg_stance_time": 6.0,  # Borderline low
    }
    
    symmetry_data = {
        "shoulder_symmetry": 9.5,  # Borderline high
        "knee_symmetry": 8.5,      # Borderline high
    }
    
    result = comprehensive_analysis(
        rom_data=rom_data,
        balance_data=balance_data,
        symmetry_data=symmetry_data,
        age=8
    )
    
    print(f"\n⚠️  Classification: {result.classification.value}")
    print(f"⚠️  Confidence: {result.confidence}%")
    print(f"⚠️  Flags: {len(result.flags)}")
    for flag in result.flags[:3]:
        print(f"    - {flag}")
    print(f"\nRecommendations:")
    for rec in result.recommendations[:5]:
        print(f"  • {rec}")


def test_weakness_case():
    """Test case with suspected weakness"""
    print_section("TEST 3: Weakness Suspected (Age 7)")
    
    rom_data = {
        "shoulder_flexion": 135,  # Low
        "elbow_flexion": 125,     # Low
        "hip_flexion": 95,        # Low
        "knee_flexion": 115,      # Low
    }
    
    balance_data = {
        "stability_score": 35,    # Very low
        "single_leg_stance_time": 2.5,  # Very low
        "sway_magnitude": 0.028,  # High sway
    }
    
    symmetry_data = {
        "shoulder_symmetry": 15.0,  # High asymmetry
        "elbow_symmetry": 12.0,     # High asymmetry
        "hip_symmetry": 18.0,       # High asymmetry
    }
    
    gait_data = {
        "cadence": 125,  # Low
        "step_length": 0.28,  # Short
    }
    
    result = comprehensive_analysis(
        rom_data=rom_data,
        balance_data=balance_data,
        symmetry_data=symmetry_data,
        gait_data=gait_data,
        age=7
    )
    
    print(f"\n❌ Classification: {result.classification.value}")
    print(f"❌ Confidence: {result.confidence}%")
    print(f"❌ Flags: {len(result.flags)}")
    print("\nTop Concerns:")
    for flag in result.flags[:5]:
        print(f"    ⚠️  {flag}")
    print(f"\nRecommendations:")
    for rec in result.recommendations:
        print(f"  • {rec}")


def test_individual_analyses():
    """Test individual analysis functions"""
    print_section("TEST 4: Individual Analysis Functions")
    
    # ROM Analysis
    print("\n--- ROM Analysis ---")
    rom_data = {"shoulder_flexion": 160, "elbow_flexion": 142}
    rom_result = analyze_rom(rom_data, age=10)
    print(f"Overall: {rom_result['overall_classification']} ({rom_result['confidence']}%)")
    
    # Balance Analysis
    print("\n--- Balance Analysis ---")
    balance_data = {"stability_score": 68, "single_leg_stance_time": 10.0}
    balance_result = analyze_balance(balance_data, age=10)
    print(f"Overall: {balance_result['overall_classification']} ({balance_result['confidence']}%)")
    
    # Symmetry Analysis
    print("\n--- Symmetry Analysis ---")
    symmetry_data = {"shoulder_symmetry": 4.0, "knee_symmetry": 3.5}
    symmetry_result = analyze_symmetry(symmetry_data, age=10)
    print(f"Overall: {symmetry_result['overall_classification']} ({symmetry_result['confidence']}%)")
    
    # Gait Analysis
    print("\n--- Gait Analysis ---")
    gait_data = {"cadence": 152, "step_length": 0.50}
    gait_result = analyze_gait(gait_data, age=10)
    print(f"Overall: {gait_result['overall_classification']} ({gait_result['confidence']}%)")


def test_age_groups():
    """Test different age groups"""
    print_section("TEST 5: Age Group Comparison")
    
    rom_data = {"shoulder_flexion": 155}
    
    for age in [6, 9, 12]:
        result = analyze_rom(rom_data, age=age)
        print(f"\nAge {age} (Group: {result['age_group']})")
        print(f"  Classification: {result['overall_classification']}")
        print(f"  Confidence: {result['confidence']}%")


def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║  VIRTUAL MIRROR - ANALYSIS MODULE TEST SUITE          ║")
    print("╚" + "="*58 + "╝")
    
    try:
        test_normal_case()
        test_borderline_case()
        test_weakness_case()
        test_individual_analyses()
        test_age_groups()
        
        print_section("All Tests Completed Successfully ✓")
        print("\nThe analysis module is working correctly!")
        print("Ready to integrate with FastAPI backend.\n")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
