# Testing Documentation - Virtual Mirror

## Overview
Comprehensive unit tests have been implemented for the kinematics utility functions using Vitest testing framework.

## Test Setup

### Installed Dependencies
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### Configuration Files

#### vitest.config.ts
- React plugin integration
- jsdom environment for DOM testing
- Coverage reporting configured (v8 provider)
- Path alias support (@/ -> ./src)

#### src/test/setup.ts
- Test environment setup
- Automatic cleanup after each test
- jest-dom matchers integration

### Package.json Scripts
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

## Test Coverage

### File: src/utils/kinematics.test.ts
**Total Tests: 51 (All Passing ✅)**

#### 1. calculateAngle Tests (8 tests)
- 90-degree angle calculation
- 180-degree angle (straight line)
- 45-degree angle
- Various angle calculations
- Obtuse angle (> 90 degrees)
- 3D points handling
- Coincident points (returns 0)
- Negative coordinates

#### 2. calculateROM Tests (9 tests)
- Minimum angle calculation
- Maximum angle calculation
- Range calculation
- Mean calculation
- Standard deviation calculation
- Single value handling
- Empty array handling
- All identical values
- Negative angles

#### 3. calculateSymmetry Tests (10 tests)
- Perfect symmetry (0%)
- Asymmetry percentage calculation
- Excellent classification (≤ 5%)
- Good classification (5-10%)
- Fair classification (10-20%)
- Poor classification (≥ 20%)
- Reversed order (left < right)
- Zero values handling
- One zero value handling
- Negative values handling

#### 4. calculateBalance Tests (11 tests)
- Balance metrics calculation for sway data
- Stability score (0-100 range)
- Stability level classification
- Single position handling (zero values)
- Empty arrays handling
- Identical positions (no movement)
- Large sway (poor stability)
- Small sway (excellent stability)
- Higher balance index for larger sway
- Mismatched array lengths
- Consistent results verification

#### 5. smoothAngleSeries Tests (9 tests)
- Moving average smoothing
- Window size of 1 (no smoothing)
- Window size larger than array
- Empty array handling
- Single element handling
- Noise reduction in noisy data
- Overall trend preservation
- Negative angles handling
- Default window size (5)

#### 6. Edge Cases and Integration Tests (4 tests)
- Very small differences in calculateAngle
- Very large values in calculateSymmetry
- Chained ROM and smoothing operations
- Balance calculation with outliers

## Running Tests

### Run all tests
```bash
npm test
```

### Run with UI
```bash
npm run test:ui
```

### Run with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npx vitest run src/utils/kinematics.test.ts
```

## Test Results

```
Test Files  1 passed (1)
Tests  51 passed (51)
Duration  ~1.1s
```

## Key Testing Patterns

### 1. Boundary Testing
- Empty arrays
- Single elements
- Zero values
- Negative values
- Very large values

### 2. Classification Testing
- All classification levels tested (excellent, good, fair, poor)
- Boundary values for each classification

### 3. Edge Cases
- Coincident points
- Mismatched array lengths
- Outlier values
- Very small differences

### 4. Integration Testing
- Chained operations
- Function composition
- Consistent results verification

## Best Practices Implemented

1. **Descriptive test names**: Clear indication of what is being tested
2. **Arrange-Act-Assert pattern**: Well-structured test cases
3. **Helper functions**: Reusable calculateVariance helper
4. **Comprehensive coverage**: All utility functions tested
5. **Edge case handling**: Boundary conditions thoroughly tested
6. **Type safety**: Full TypeScript integration
7. **Fast execution**: All tests run in ~1 second

## Future Enhancements

1. Add integration tests for React components
2. Add end-to-end tests for full user flows
3. Implement visual regression testing
4. Add performance benchmarks
5. Add mutation testing for test quality verification

## Maintenance

### Adding New Tests
1. Add test cases to appropriate describe block
2. Follow existing naming patterns
3. Include edge cases
4. Run tests to verify: `npm test`

### Updating Tests
1. Update test expectations when function behavior changes
2. Ensure all related tests are updated
3. Verify no regressions: `npm test`

## Dependencies

- **vitest**: ^4.0.6 - Test framework
- **@vitest/ui**: ^4.0.6 - Test UI
- **@testing-library/react**: ^16.3.0 - React testing utilities
- **@testing-library/jest-dom**: ^6.9.1 - DOM matchers
- **jsdom**: ^27.1.0 - DOM implementation

---

*Last Updated: 2025*
*All tests passing ✅*
