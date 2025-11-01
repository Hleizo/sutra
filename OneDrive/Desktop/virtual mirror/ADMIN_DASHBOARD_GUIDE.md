# Admin Dashboard - User Guide

## Overview
The Admin Dashboard provides comprehensive session management and detailed analytics for all assessment sessions. It features advanced filtering, data visualization with charts, and detailed performance metrics.

## Features

### 1. **Session Table View**
- **Columns:**
  - **ID**: Unique session identifier
  - **Date**: Session creation timestamp
  - **Task Type**: Assessment type performed
  - **Child Age**: Age of the patient (5-16 years)
  - **Stability**: Body steadiness score (0-100)
  - **Balance**: Weight distribution score (0-100)
  - **Risk Score**: Fall risk indicator (0-100)
  - **Risk Level**: High/Medium/Normal classification
  - **Status**: Processing status
  - **Actions**: View, Download, Delete buttons

### 2. **Advanced Filtering**
- **Search Bar**: Filter by ID, task type, or age
- **Risk Level Filter**: Show only High/Medium/Normal risk sessions
- **Age Group Filter**: 
  - Child (5-12 years)
  - Teen (13-17 years)
  - Adult (18+ years)

### 3. **Session Detail View**
Click the "View" (eye icon) button to see detailed analysis with interactive charts:

#### **Overview Cards**
- Task Type, Child Age, Duration, Risk Level at a glance

#### **Score Cards**
Large, color-coded displays showing:
- Stability Score (green/orange/red)
- Balance Score (green/orange/red)
- Symmetry Score
- Risk Score

#### **Interactive Charts**

**1. Overall Performance Radar Chart**
- Multi-axis visualization showing:
  - Stability
  - Balance
  - Symmetry
  - Range of Motion (ROM)
  - Posture
- Scores compared to 100% full mark

**2. Stability & Balance Over Time**
- Area chart showing performance throughout the 10-second test
- Two metrics overlaid: Stability (green) and Balance (blue)
- Target line at 85% for reference

**3. Range of Motion (ROM) Analysis**
- Bar chart comparing left vs. right side ROM
- Joints analyzed: Hip, Knee, Ankle, Shoulder
- Normal range shown for reference (semi-transparent bars)

**4. Symmetry Analysis**
- Horizontal bar chart showing:
  - Weight Distribution
  - Stance Width
  - Hip Alignment
  - Shoulder Level
- Measured values compared to ideal 50/50 distribution

### 4. **Key Findings & Recommendations**
Automated analysis based on scores:

**High Risk Sessions:**
- ⚠️ Alert: Immediate intervention recommended
- Suggests physical therapy and balance training

**Medium Risk Sessions:**
- ⚠️ Warning: Preventive measures suggested
- Recommends regular monitoring

**Specific Recommendations:**
- Stability < 70: Core strengthening exercises
- Balance < 70: Weight shifting and balance board work
- Symmetry < 70: Physical therapy assessment for imbalances

**Normal Sessions:**
- ✅ Success: Continue regular activity
- Periodic reassessment recommended

### 5. **Summary Statistics**
Four metric cards at the bottom showing:
- **Total Sessions**: All sessions in database
- **High Risk**: Count of high-risk assessments (red)
- **Medium Risk**: Count of medium-risk assessments (orange)
- **Normal**: Count of normal assessments (green)

## How to Use

### Accessing the Dashboard
1. From Landing page, click **"Admin Dashboard"** button
2. Or navigate directly to `/admin` route

### Viewing All Sessions
1. Table loads automatically with all sessions
2. Use pagination controls to navigate (5/10/25/50 rows per page)
3. Scroll horizontally if needed on smaller screens

### Filtering Sessions
1. **Search**: Type in search bar to filter by ID, task type, or age
2. **Risk Filter**: Select dropdown to show only specific risk levels
3. **Age Filter**: Select dropdown to filter by age group
4. Filters work together (AND logic)

### Viewing Session Details
1. Click the **eye icon** in the Actions column
2. Detailed view opens with all charts
3. Scroll through different chart sections
4. Review key findings at the bottom
5. Click **back arrow** or "Back" to return to table

### Downloading Reports
1. From table: Click **download icon** in Actions column
2. From detail view: Click **"Download Report"** button
3. PDF report downloads automatically
4. Note: Only available for "processed" status sessions

### Deleting Sessions
1. Click **trash icon** in Actions column
2. Confirm deletion in popup dialog
3. Session removed from table immediately

### Refreshing Data
1. Click **"Refresh"** button in top-right
2. Reloads all sessions from backend
3. Useful after running new assessments

## Chart Interpretation

### Color Coding
- **Green (#4caf50)**: Good performance (≥80%)
- **Orange (#ff9800)**: Fair performance (60-79%)
- **Red (#f44336)**: Poor performance (<60%)

### Risk Levels
- **High (Red)**: Risk score 67-100, 2+ abnormal flags
- **Medium (Orange)**: Risk score 34-66, 1 abnormal flag
- **Normal (Green)**: Risk score 0-33, 0 abnormal flags

### Radar Chart
- **Area size**: Larger = better overall performance
- **Balance**: Symmetrical shape indicates balanced abilities
- **Weak points**: Inward dips show areas needing improvement

### ROM Chart
- **Left vs Right**: Bars should be similar height
- **Comparison to Normal**: Bars close to yellow = good ROM
- **Asymmetry**: Large differences may indicate injury or imbalance

### Symmetry Chart
- **Ideal Value**: All metrics should be near 50%
- **Deviations**: Far from 50% indicates asymmetry
- **Critical Metrics**: Weight distribution most important for fall risk

## Data Flow

```
Backend Database
    ↓
GET /api/sessions/ (Load all sessions)
    ↓
Admin Dashboard Table (with filters)
    ↓
Click View Details
    ↓
Session Detail View (charts generated from session data)
    ↓
Download PDF → GET /api/sessions/{id}/report.pdf
```

## Technical Details

### Mock Data
Currently, child age and time-series chart data are generated as mock data in the frontend. In production:
- Child age should come from backend user profiles
- Time-series data from frame-by-frame pose analysis
- ROM measurements from joint angle calculations
- Symmetry from left-right landmark comparisons

### Real-Time Updates
- Data refreshes on component mount
- Manual refresh available via button
- Delete operations update table immediately
- No auto-refresh (prevents performance issues with large datasets)

### Performance
- Pagination prevents rendering large datasets
- Charts use ResponsiveContainer for optimal sizing
- Filters apply client-side (fast response)
- Lazy loading for detail view (only loads charts when needed)

## Keyboard Shortcuts
- **Enter**: Confirm delete dialog
- **Escape**: Close detail view
- **Arrow keys**: Navigate table rows (browser default)

## Troubleshooting

### No Sessions Showing
**Problem**: Table shows "No sessions found"

**Solutions:**
1. Click Refresh button
2. Check backend is running (http://127.0.0.1:8000)
3. Run demo script to generate test data
4. Clear filters (set all to "All")

### Charts Not Displaying
**Problem**: Charts area is blank

**Solutions:**
1. Ensure Recharts is installed: `npm install recharts`
2. Check browser console for errors
3. Verify session has data (status = "processed")

### PDF Download Fails
**Problem**: Click download but nothing happens

**Solutions:**
1. Check session status is "processed"
2. Verify backend PDF endpoint working
3. Check browser's download settings
4. Look for popup blocker issues

### Filters Not Working
**Problem**: Filters don't reduce results

**Solutions:**
1. Check if sessions match filter criteria
2. Try clearing search query first
3. Refresh page (Ctrl+R / Cmd+R)

## Best Practices

### For Clinicians
1. **Review high-risk sessions first** - Use risk filter
2. **Compare sessions over time** - Look at dates and trends
3. **Focus on specific metrics** - Use charts to identify problem areas
4. **Document findings** - Download PDFs for records

### For Administrators
1. **Regular cleanup** - Delete test sessions periodically
2. **Monitor trends** - Check summary statistics
3. **Data validation** - Review sessions with unusual scores
4. **Backup reports** - Download PDFs before deletion

### For Researchers
1. **Filter by age group** - Analyze specific populations
2. **Export multiple sessions** - Download PDFs for analysis
3. **Track metrics over time** - Use date sorting
4. **Identify patterns** - Use charts to spot trends

## Future Enhancements

### Planned Features
- [ ] Export table to CSV/Excel
- [ ] Date range filtering
- [ ] Bulk delete operations
- [ ] Print-friendly view
- [ ] Comparison mode (side-by-side sessions)
- [ ] Trend analysis over multiple sessions
- [ ] Custom chart configurations
- [ ] Real-time notifications for high-risk assessments
- [ ] User authentication and roles
- [ ] Patient profiles with history

### Data Integration
- [ ] Connect child age to user profiles
- [ ] Real-time ROM calculations from pose data
- [ ] Frame-by-frame stability tracking
- [ ] Advanced symmetry metrics
- [ ] Machine learning risk predictions

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions/` | GET | Load all sessions |
| `/api/sessions/{id}` | DELETE | Delete session |
| `/api/sessions/{id}/report.pdf` | GET | Download PDF |

## Component Architecture

```
AdminDashboard.tsx (Main page)
    ├── Filter controls (Search, Risk, Age)
    ├── Session table with pagination
    ├── Summary statistics cards
    └── SessionDetailView.tsx (Detail page)
        ├── Session info cards
        ├── Score cards
        ├── Charts (Recharts)
        └── Key findings list
```

## Styling & Theming
- Material-UI components for consistency
- Responsive design (works on mobile/tablet/desktop)
- Color-coded risk levels throughout
- Professional medical aesthetic
- Accessible (WCAG AA compliant)

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Support
For issues or feature requests, check:
1. Browser console for errors
2. Network tab for failed API calls
3. Backend logs for server errors
4. FRONTEND_BACKEND_INTEGRATION.md for setup

---

**Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Author**: Virtual Mirror Team
