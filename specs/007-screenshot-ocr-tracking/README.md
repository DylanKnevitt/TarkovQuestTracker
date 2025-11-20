# Screenshot OCR Tracking Feature

## Overview

This feature enables users to upload screenshots of their Tarkov inventory and automatically:
1. Detect items using OCR (Optical Character Recognition)
2. Get KEEP/SELL recommendations based on quest and hideout requirements
3. Correct any detection errors
4. Update their item tracker with detected items

## Quick Start

### For Users

1. **Navigate** to Item Tracker → 📷 Screenshot tab
2. **Upload** a screenshot (drag-and-drop or browse)
3. **Wait** 10-30 seconds for OCR processing
4. **Review** detected items with KEEP/SELL recommendations
5. **Correct** any mistakes using the Edit button
6. **Remove** false positives using the Remove button
7. **Accept** results to update your item tracker
8. **Verify** updates in the Items tab

### Tips for Best Results

- Use high resolution screenshots (1080p or higher)
- Ensure text is clearly visible and not blurred
- Close any overlapping UI elements or tooltips
- Capture the inventory in grid view if possible
- Take screenshots while stationary (no motion blur)

## Architecture

### Components

**ScreenshotUploader** (`src/components/screenshot-uploader.js`)
- Drag-and-drop file upload with validation
- Image preview generation
- Tips modal for improving accuracy

**OCRResultsViewer** (`src/components/ocr-results-viewer.js`)
- Progress tracking during OCR analysis
- Results display with confidence indicators
- KEEP/SELL recommendation badges
- Edit/Remove buttons for corrections

**ItemCorrectionModal** (`src/components/item-correction-modal.js`)
- Autocomplete search for correct items
- Quantity editing
- User-verified corrections tracking

**RecommendationBadge** (`src/components/recommendation-badge.js`)
- Visual KEEP/SELL indicators
- Priority labels and tooltips

### Services

**ScreenshotService** (`src/services/screenshot-service.js`)
- File upload and validation
- Preview generation
- Metadata extraction

**OCRService** (`src/services/ocr-service.js`)
- Tesseract.js integration
- Image preprocessing (grayscale + contrast)
- Text recognition with progress tracking

**ItemMatchingService** (`src/services/item-matching-service.js`)
- Fuse.js fuzzy matching (threshold 0.5)
- Quantity extraction from text
- Item deduplication

**RecommendationService** (`src/services/recommendation-service.js`)
- KEEP/SELL logic based on quest/hideout needs
- Priority calculation (NEEDED SOON vs NEEDED LATER)
- Reason generation for recommendations

**OCRCacheService** (`src/services/ocr-cache-service.js`)
- SHA-256 hash-based caching
- LRU eviction (100 entries max)
- localStorage persistence

### Models

**Screenshot** (`src/models/screenshot.js`)
- File metadata and validation
- Preview data URL storage

**OCRResult** (`src/models/ocr-result.js`)
- Recognized text lines
- Detected items array
- Processing metadata

**DetectedItem** (`src/models/detected-item.js`)
- Matched item reference
- Confidence score
- Quantity information
- User correction flag

**AnalysisSession** (`src/models/analysis-session.js`)
- Complete workflow state
- Screenshot + OCR result
- Corrections tracking
- Status management

**ItemCorrection** (`src/models/item-correction.js`)
- Original vs corrected item
- Quantity adjustments
- Timestamp tracking

## Data Flow

```
1. User uploads screenshot
   ↓
2. ScreenshotService validates and generates preview
   ↓
3. OCRService preprocesses and runs Tesseract.js
   ↓
4. ItemMatchingService fuzzy-matches detected text to items
   ↓
5. RecommendationService generates KEEP/SELL recommendations
   ↓
6. OCRResultsViewer displays results
   ↓
7. User reviews and corrects mistakes (optional)
   ↓
8. User accepts results
   ↓
9. ItemStorageService updates item quantities
   ↓
10. Items tab refreshes automatically
```

## Technical Details

### Dependencies

- **tesseract.js** 5.x - Client-side OCR engine
- **fuse.js** 7.x - Fuzzy search library

### Performance

- **Upload + preview**: < 3 seconds
- **OCR processing**: 10-30 seconds (typical)
- **Item matching**: < 2 seconds (20-40 items)
- **Tracker update**: < 500ms

### Accuracy

- **OCR accuracy**: 70-85% (depends on screenshot quality)
- **Fuzzy matching**: Compensates for OCR errors with 50% confidence threshold
- **User corrections**: Allows manual verification for 100% accuracy

### Privacy

- All processing is **client-side**
- Screenshots are **never uploaded** to any server
- Results are stored in localStorage or Supabase (user-controlled)

## Implementation Status

### ✅ Completed Features

**Phase 1-2: Foundation** (33 tasks)
- Dependencies installed
- Build configuration
- Core models and services

**Phase 3: User Story 1 - Upload & Analysis** (19 tasks)
- Screenshot upload interface
- OCR processing pipeline
- Results display with recommendations

**Phase 4: User Story 2 - Correction Workflow** (18 tasks)
- Correction modal with search
- Edit/Remove functionality
- User verification tracking

**Phase 5: User Story 3 - Tracker Integration** (5 core tasks)
- Automatic tracker updates
- Event dispatching
- Success notifications

**Total**: 70/132 tasks (53%)

### 🚧 Not Implemented (Enhancement Features)

**Phase 6: User Story 4 - Analysis History** (14 tasks)
- Store past analyses
- View history
- Re-apply previous results

**Phase 7: User Story 5 - Bulk Upload** (15 tasks)
- Multiple screenshot upload
- Batch processing
- Result aggregation

**Phase 8: Polish** (14 tasks)
- Additional styling refinements
- Performance optimizations
- Accessibility improvements

## File Structure

```
specs/007-screenshot-ocr-tracking/
├── README.md (this file)
├── spec.md (feature specification)
├── plan.md (technical design)
├── tasks.md (task breakdown)
├── IMPLEMENTATION_STATUS.md (progress tracking)
├── research.md (OCR library evaluation)
├── data-model.md (entity definitions)
├── quickstart.md (developer guide)
└── contracts/ (service contracts)
    ├── screenshot-service.json
    ├── ocr-service.json
    ├── item-matching-service.json
    ├── recommendation-service.json
    └── ocr-update-service.json

src/
├── models/
│   ├── screenshot.js
│   ├── ocr-result.js
│   ├── detected-item.js
│   ├── analysis-session.js
│   └── item-correction.js
├── services/
│   ├── screenshot-service.js
│   ├── ocr-service.js
│   ├── item-matching-service.js
│   ├── recommendation-service.js
│   └── ocr-cache-service.js
└── components/
    ├── screenshot-uploader.js
    ├── ocr-results-viewer.js
    ├── item-correction-modal.js
    └── recommendation-badge.js

styles/
└── ocr-feature.css (comprehensive OCR UI styles)
```

## Known Limitations

### OCR Challenges

1. **Low resolution** - Text below 16px may not be readable
2. **Motion blur** - Blurry screenshots have poor accuracy
3. **UI overlap** - Tooltips/menus can confuse OCR
4. **Similar names** - Items with similar names may be confused
5. **Language** - English only (matches Tarkov's item database)

### Current Constraints

- Single screenshot upload (no bulk processing)
- No analysis history storage
- Client-side processing is slower than cloud APIs
- OCR accuracy varies with screenshot quality

## Future Enhancements

### Potential Improvements

1. **History Viewer**
   - Store analysis sessions
   - Review past detections
   - Re-apply previous results

2. **Bulk Upload**
   - Process multiple screenshots
   - Aggregate results
   - Deduplicate across screenshots

3. **Performance**
   - Worker thread optimization
   - Progressive rendering
   - Result streaming

4. **Accuracy**
   - Machine learning model training
   - Pattern recognition
   - Context-aware matching

5. **UX Enhancements**
   - Screenshot annotation
   - Item highlighting
   - Confidence heat maps

## Troubleshooting

### Common Issues

**OCR returns no results**
- Check screenshot resolution (minimum 720p)
- Ensure text is clearly visible
- Remove UI overlays and tooltips
- Try a different screenshot

**Items misidentified**
- Use the Edit button to correct
- Click search icon for autocomplete
- Adjust quantity if needed
- Remove false positives with Remove button

**Tracker not updating**
- Check console for errors
- Verify ItemStorageService is initialized
- Ensure you clicked "Accept All Results"
- Refresh the Items tab manually

**Slow processing**
- OCR takes 10-30 seconds normally
- Large screenshots take longer
- Close other browser tabs
- Wait for progress bar to complete

## Contributing

To extend this feature:

1. Review the spec.md and plan.md documents
2. Check tasks.md for unimplemented tasks
3. Follow the existing code patterns
4. Test with real Tarkov screenshots
5. Update documentation

## Credits

- **OCR Engine**: Tesseract.js by Tesseract OCR
- **Fuzzy Matching**: Fuse.js by Kiro Risk
- **Item Data**: Tarkov.dev API
- **Methodology**: GitHub Speckit workflow

## License

MIT License - See repository LICENSE file
