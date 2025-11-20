# Tasks: Screenshot-Based OCR Tracking

**Feature**: 007-screenshot-ocr-tracking  
**Input**: Design documents from `/specs/007-screenshot-ocr-tracking/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: No automated tests requested - following existing project pattern (manual browser testing only)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and initialize project structure for OCR feature

- [X] T001 Install Tesseract.js ^5.0.0 and Fuse.js ^7.0.0 via npm
- [X] T002 Update vite.config.js to add OCR and search chunks for lazy loading
- [X] T003 [P] Create src/models/ directory structure for OCR entities
- [X] T004 [P] Create src/services/ directory for OCR services (if not exists)
- [X] T005 [P] Create src/components/ directory for OCR UI components (if not exists)
- [X] T006 [P] Create styles/ocr-feature.css for OCR-specific styles

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and base services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create Screenshot model in src/models/screenshot.js
- [X] T008 [P] Create OCRResult model in src/models/ocr-result.js
- [X] T009 [P] Create DetectedItem model in src/models/detected-item.js
- [X] T010 [P] Create AnalysisSession model in src/models/analysis-session.js
- [X] T011 Implement ScreenshotService.validateFile() in src/services/screenshot-service.js
- [X] T012 Implement ScreenshotService.generatePreview() in src/services/screenshot-service.js
- [X] T013 Implement ScreenshotService.loadImageForOCR() in src/services/screenshot-service.js
- [X] T014 Implement ScreenshotService.getImageDimensions() in src/services/screenshot-service.js
- [X] T015 Implement ScreenshotService.createScreenshotEntity() in src/services/screenshot-service.js
- [X] T016 Implement OCRCacheService.generateHash() in src/services/ocr-cache-service.js
- [X] T017 Implement OCRCacheService.get() and set() in src/services/ocr-cache-service.js
- [X] T018 Implement OCRCacheService.evictOldEntries() and cleanup in src/services/ocr-cache-service.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload and Analyze Inventory Screenshot (Priority: P1) 🎯 MVP

**Goal**: Enable users to upload a screenshot, run OCR analysis, and see detected items with keep/sell recommendations

**Independent Test**: Upload a test screenshot containing known items (e.g., Graphics card, Gas analyzer), verify that OCR detects items and displays them with confidence scores and correct KEEP/SELL recommendations based on quest/hideout requirements

### Implementation for User Story 1

**Step 1: OCR Core Services**

- [X] T019 [P] [US1] Implement OCRService.initialize() in src/services/ocr-service.js
- [X] T020 [P] [US1] Implement OCRService.preprocessImage() in src/services/ocr-service.js
- [X] T021 [US1] Implement OCRService.recognizeText() with progress tracking in src/services/ocr-service.js
- [X] T022 [US1] Implement OCRService.terminate() and isProcessing() in src/services/ocr-service.js
- [X] T023 [P] [US1] Create ItemMatchingService constructor with Fuse.js initialization in src/services/item-matching-service.js
- [X] T024 [P] [US1] Implement ItemMatchingService.extractQuantity() in src/services/item-matching-service.js
- [X] T025 [P] [US1] Implement ItemMatchingService.preprocessText() in src/services/item-matching-service.js
- [X] T026 [US1] Implement ItemMatchingService.matchItem() in src/services/item-matching-service.js
- [X] T027 [US1] Implement ItemMatchingService.matchAllItems() in src/services/item-matching-service.js
- [X] T028 [US1] Implement ItemMatchingService.deduplicateItems() in src/services/item-matching-service.js

**Step 2: Recommendation Service**

- [X] T029 [P] [US1] Create RecommendationService constructor in src/services/recommendation-service.js
- [X] T030 [P] [US1] Implement RecommendationService.calculatePriority() in src/services/recommendation-service.js
- [X] T031 [P] [US1] Implement RecommendationService.formatReason() in src/services/recommendation-service.js
- [X] T032 [US1] Implement RecommendationService.getRecommendation() in src/services/recommendation-service.js
- [X] T033 [US1] Implement RecommendationService.generateRecommendations() in src/services/recommendation-service.js

**Step 3: Upload UI Components**

- [X] T034 [P] [US1] Create ScreenshotUploader component shell in src/components/screenshot-uploader.js
- [X] T035 [US1] Implement drag-and-drop file upload in src/components/screenshot-uploader.js
- [X] T036 [US1] Implement file picker fallback in src/components/screenshot-uploader.js
- [X] T037 [US1] Implement preview generation and display in src/components/screenshot-uploader.js
- [X] T038 [US1] Add file validation error handling in src/components/screenshot-uploader.js
- [X] T039 [P] [US1] Style upload UI in styles/ocr-feature.css (drag-drop area, preview card)

**Step 4: Analysis Display Components**

- [X] T040 [P] [US1] Create RecommendationBadge component in src/components/recommendation-badge.js
- [X] T041 [P] [US1] Style KEEP/SELL badges in styles/ocr-feature.css
- [X] T042 [P] [US1] Create OCRResultsViewer component shell in src/components/ocr-results-viewer.js
- [X] T043 [US1] Implement progress indicator in src/components/ocr-results-viewer.js
- [X] T044 [US1] Implement detected items list display in src/components/ocr-results-viewer.js
- [X] T045 [US1] Integrate RecommendationBadge into item cards in src/components/ocr-results-viewer.js
- [X] T046 [US1] Add confidence indicators and warnings in src/components/ocr-results-viewer.js
- [X] T047 [P] [US1] Style results viewer in styles/ocr-feature.css (progress bar, item cards, confidence)

**Step 5: Screenshot Tab Integration**

- [X] T048 [US1] Add Screenshot tab to ItemTracker component in src/components/item-tracker.js
- [X] T049 [US1] Create OCR workflow orchestration (upload → analyze → display results) in src/components/item-tracker.js
- [X] T050 [US1] Wire up ScreenshotUploader and OCRResultsViewer in Screenshot tab
- [X] T051 [US1] Implement "Analyze" button handler with OCR pipeline
- [X] T052 [US1] Add error handling and user feedback for OCR failures

**Checkpoint**: User Story 1 complete - users can upload screenshots, see OCR results, and get keep/sell recommendations

---

## Phase 4: User Story 2 - Review and Correct OCR Results (Priority: P1)

**Goal**: Allow users to manually correct misidentified items and remove false positives before updating tracker

**Independent Test**: Upload a screenshot with intentionally misidentified item (or simulate OCR error), use correction modal to search for correct item, confirm correction updates the item to 100% confidence without affecting other items

### Implementation for User Story 2

**Step 1: Correction Modal Component**

- [ ] T053 [P] [US2] Create ItemCorrectionModal component shell in src/components/item-correction-modal.js
- [ ] T054 [US2] Implement autocomplete search using ItemMatchingService in src/components/item-correction-modal.js
- [ ] T055 [US2] Implement item selection and confirmation in src/components/item-correction-modal.js
- [ ] T056 [US2] Implement quantity editing in src/components/item-correction-modal.js
- [ ] T057 [US2] Add validation for corrections in src/components/item-correction-modal.js
- [ ] T058 [P] [US2] Style correction modal in styles/ocr-feature.css

**Step 2: Integration with Results Viewer**

- [ ] T059 [US2] Add "Edit" button to each detected item card in src/components/ocr-results-viewer.js
- [ ] T060 [US2] Add "Remove" button to each detected item card in src/components/ocr-results-viewer.js
- [ ] T061 [US2] Integrate ItemCorrectionModal into OCRResultsViewer
- [ ] T062 [US2] Implement correction application logic (update DetectedItem) in src/components/ocr-results-viewer.js
- [ ] T063 [US2] Implement item removal logic (mark as removed) in src/components/ocr-results-viewer.js
- [ ] T064 [US2] Add visual indicator for corrected items ("User Corrected" badge)

**Step 3: Correction Data Model**

- [ ] T065 [P] [US2] Create ItemCorrection model in src/models/item-correction.js
- [ ] T066 [US2] Add corrections array to AnalysisSession model in src/models/analysis-session.js
- [ ] T067 [US2] Implement correction tracking and storage in AnalysisSession

**Step 4: Review Workflow**

- [ ] T068 [US2] Add "Accept All" button to OCRResultsViewer in src/components/ocr-results-viewer.js
- [ ] T069 [US2] Implement confirmed items filtering (exclude removed) in src/components/ocr-results-viewer.js
- [ ] T070 [US2] Update AnalysisSession status to READY after confirmation

**Checkpoint**: User Story 2 complete - users can correct OCR mistakes and remove false positives before updating tracker

---

## Phase 5: User Story 3 - Automatically Update Item Collection Status (Priority: P2)

**Goal**: Enable users to update their item tracker with confirmed OCR detections in bulk

**Independent Test**: Confirm OCR results with known items, click "Update Tracker", verify items appear as collected in Item Tracker tab with correct quantities, and verify repeated updates don't create duplicates

### Implementation for User Story 3

**Step 1: Update Service**

- [ ] T071 [P] [US3] Create TrackerUpdate model in src/models/tracker-update.js
- [ ] T072 [P] [US3] Implement OCRUpdateService.previewChanges() in src/services/ocr-update-service.js
- [ ] T073 [P] [US3] Implement OCRUpdateService.handleQuantityConflict() in src/services/ocr-update-service.js
- [ ] T074 [P] [US3] Implement OCRUpdateService.validateUpdate() in src/services/ocr-update-service.js
- [ ] T075 [US3] Implement OCRUpdateService.updateTrackerFromOCR() in src/services/ocr-update-service.js
- [ ] T076 [US3] Implement OCRUpdateService.createUpdateRecord() in src/services/ocr-update-service.js

**Step 2: Preview Modal**

- [ ] T077 [P] [US3] Create preview changes modal component in src/components/ocr-results-viewer.js
- [ ] T078 [US3] Display before/after comparison for each item
- [ ] T079 [US3] Show summary statistics (new items, quantity increases, unchanged)
- [ ] T080 [P] [US3] Style preview modal in styles/ocr-feature.css

**Step 3: Tracker Integration**

- [ ] T081 [US3] Add "Preview Changes" button to OCRResultsViewer in src/components/ocr-results-viewer.js
- [ ] T082 [US3] Add "Update Tracker" button to OCRResultsViewer in src/components/ocr-results-viewer.js
- [ ] T083 [US3] Implement preview changes handler with OCRUpdateService
- [ ] T084 [US3] Implement update tracker handler with ItemStorageService integration
- [ ] T085 [US3] Dispatch itemCollectionUpdated event after update
- [ ] T086 [US3] Add success message after tracker update
- [ ] T087 [US3] Update AnalysisSession status to UPDATED after tracker sync

**Step 4: Event Listener**

- [ ] T088 [US3] Add itemCollectionUpdated event listener to ItemTracker component in src/components/item-tracker.js
- [ ] T089 [US3] Implement auto-refresh of Items tab when OCR update occurs

**Checkpoint**: User Story 3 complete - users can bulk update tracker from OCR results with preview

---

## Phase 6: User Story 4 - View Screenshot Analysis History (Priority: P3)

**Goal**: Allow users to view past screenshot analyses and re-apply previous results

**Independent Test**: Upload and analyze 2-3 screenshots across different sessions, close and reopen app, access history view, verify all past analyses are listed with thumbnails and timestamps, open a past analysis and verify all detected items and recommendations are still visible

### Implementation for User Story 4

**Step 1: Session Persistence**

- [ ] T090 [P] [US4] Implement session persistence to localStorage in src/services/analysis-session-storage.js
- [ ] T091 [P] [US4] Implement session loading from localStorage in src/services/analysis-session-storage.js
- [ ] T092 [US4] Add auto-save after OCR complete in AnalysisSession workflow
- [ ] T093 [US4] Add auto-save after corrections in AnalysisSession workflow
- [ ] T094 [US4] Add auto-save after tracker update in AnalysisSession workflow

**Step 2: History UI**

- [ ] T095 [P] [US4] Create AnalysisHistory component in src/components/analysis-history.js
- [ ] T096 [US4] Implement history list with thumbnails and timestamps
- [ ] T097 [US4] Implement session selection and detail view
- [ ] T098 [US4] Add "Re-Update Tracker" option for past sessions
- [ ] T099 [P] [US4] Style history view in styles/ocr-feature.css

**Step 3: Integration**

- [ ] T100 [US4] Add "View History" button to Screenshot tab in src/components/item-tracker.js
- [ ] T101 [US4] Integrate AnalysisHistory component into Screenshot tab
- [ ] T102 [US4] Implement history modal or side panel display
- [ ] T103 [US4] Add session cleanup (delete old sessions) option

**Checkpoint**: User Story 4 complete - users can view and re-use past screenshot analyses

---

## Phase 7: User Story 5 - Bulk Screenshot Processing (Priority: P3)

**Goal**: Enable users to upload multiple screenshots at once and see combined results

**Independent Test**: Select 3 screenshot files at once, verify all are queued and processed sequentially, verify results are combined into single list without duplicates, verify same item in multiple screenshots shows highest quantity detected

### Implementation for User Story 5

**Step 1: Multi-File Upload**

- [ ] T104 [US5] Update ScreenshotUploader to accept multiple files in src/components/screenshot-uploader.js
- [ ] T105 [US5] Implement upload queue management in src/components/screenshot-uploader.js
- [ ] T106 [US5] Add multi-file preview display in src/components/screenshot-uploader.js
- [ ] T107 [P] [US5] Style multi-file upload queue in styles/ocr-feature.css

**Step 2: Sequential Processing**

- [ ] T108 [US5] Implement sequential OCR processing for multiple screenshots
- [ ] T109 [US5] Add batch progress indicator ("Processing 2 of 5")
- [ ] T110 [US5] Handle individual screenshot failures without stopping batch

**Step 3: Result Merging**

- [ ] T111 [P] [US5] Implement result merging service in src/services/ocr-merge-service.js
- [ ] T112 [US5] Merge detected items from multiple screenshots
- [ ] T113 [US5] Deduplicate items across multiple screenshots
- [ ] T114 [US5] Keep highest quantity for duplicate items
- [ ] T115 [US5] Add "Found in multiple screenshots" indicator

**Step 4: UI Updates**

- [ ] T116 [US5] Display combined results from all screenshots
- [ ] T117 [US5] Show source screenshot for each detected item
- [ ] T118 [US5] Update summary stats to show total across all screenshots

**Checkpoint**: User Story 5 complete - users can process multiple screenshots in one session

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T119 [P] Add screenshot tips modal (lighting, resolution, clean UI) in src/components/screenshot-tips-modal.js
- [ ] T120 [P] Style tips modal in styles/ocr-feature.css
- [ ] T121 Add "Show Tips" button when low confidence detected in src/components/ocr-results-viewer.js
- [ ] T122 [P] Implement comprehensive error handling across all OCR services
- [ ] T123 [P] Add user-friendly error messages for all failure scenarios
- [ ] T124 Optimize image preprocessing for better performance
- [ ] T125 Add loading states and skeleton screens for better UX
- [ ] T126 [P] Update quickstart.md with final implementation notes (if needed)
- [ ] T127 [P] Add inline code comments for complex OCR logic
- [ ] T128 Test across different resolutions (1080p, 1440p, 4K)
- [ ] T129 Test across different browsers (Chrome, Firefox, Safari, Edge)
- [ ] T130 Performance profiling and optimization
- [ ] T131 Accessibility review (keyboard navigation, screen readers)
- [ ] T132 Final manual testing with real Tarkov screenshots

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Core upload and analysis - No dependencies on other stories
  - User Story 2 (P1): Correction UI - Depends on US1 components existing
  - User Story 3 (P2): Tracker updates - Depends on US1 and US2 (needs confirmed items)
  - User Story 4 (P3): History view - Depends on US1 (needs AnalysisSession)
  - User Story 5 (P3): Bulk upload - Depends on US1 (extends single upload)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Upload & Analyze**: Can start after Foundational (Phase 2) - INDEPENDENT
- **User Story 2 (P1) - Corrections**: Requires US1 components but independently testable with mock data
- **User Story 3 (P2) - Tracker Updates**: Requires US1 and US2 but independently testable with confirmed items
- **User Story 4 (P3) - History**: Requires US1 session structure but independently testable
- **User Story 5 (P3) - Bulk Upload**: Extends US1 but independently testable

### Within Each User Story

**User Story 1 (Upload & Analyze)**:
- Step 1 (OCR Services): T019-T028 - Models must exist first (Phase 2)
- Step 2 (Recommendations): T029-T033 - Can run parallel to Step 1
- Step 3 (Upload UI): T034-T039 - Depends on ScreenshotService (Phase 2)
- Step 4 (Results UI): T040-T047 - Can run parallel to Step 3
- Step 5 (Integration): T048-T052 - Depends on all previous steps

**User Story 2 (Corrections)**:
- Step 1: T053-T058 can run in parallel (modal component)
- Step 2: T059-T064 depends on US1 results viewer existing
- Step 3: T065-T067 can run in parallel (model updates)
- Step 4: T068-T070 depends on all previous steps

**User Story 3 (Tracker Updates)**:
- Step 1: T071-T076 can mostly run in parallel (service methods)
- Step 2: T077-T080 can run in parallel (preview modal)
- Step 3: T081-T087 depends on US2 corrections being complete
- Step 4: T088-T089 depends on step 3 complete

**User Story 4 (History)**:
- Step 1: T090-T094 can run in parallel (persistence layer)
- Step 2: T095-T099 can run in parallel (UI components)
- Step 3: T100-T103 depends on steps 1 and 2

**User Story 5 (Bulk Upload)**:
- Step 1: T104-T107 extends US1 uploader
- Step 2: T108-T110 extends US1 OCR processing
- Step 3: T111-T115 can run in parallel (merge service)
- Step 4: T116-T118 depends on step 3

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel
**Phase 2 (Foundational)**: T007-T010 (models) can run in parallel, T016-T018 (cache) can run in parallel
**User Story 1**: Many sub-steps can run in parallel as marked with [P]
**Between User Stories**: After US1 is complete, US4 and US5 can start in parallel. US2 and US3 are sequential.

---

## Parallel Example: User Story 1 Core Services

```bash
# Launch OCR service methods in parallel:
Task T019: "Implement OCRService.initialize() in src/services/ocr-service.js"
Task T020: "Implement OCRService.preprocessImage() in src/services/ocr-service.js"

# Launch ItemMatchingService methods in parallel:
Task T024: "Implement ItemMatchingService.extractQuantity() in src/services/item-matching-service.js"
Task T025: "Implement ItemMatchingService.preprocessText() in src/services/item-matching-service.js"

# Launch RecommendationService methods in parallel:
Task T030: "Implement RecommendationService.calculatePriority() in src/services/recommendation-service.js"
Task T031: "Implement RecommendationService.formatReason() in src/services/recommendation-service.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (~1 hour)
2. Complete Phase 2: Foundational (~4-6 hours)
3. Complete Phase 3: User Story 1 - Upload & Analyze (~16-20 hours)
4. Complete Phase 4: User Story 2 - Corrections (~8-10 hours)
5. **STOP and VALIDATE**: Test US1 and US2 together as standalone feature
6. Deploy/demo MVP with basic OCR functionality

**MVP Delivers**: Screenshot upload, OCR analysis, item detection with recommendations, manual corrections - fully functional screenshot analyzer

### Incremental Delivery

1. **Foundation** (Phase 1-2): Setup + Core services → ~5-7 hours
2. **MVP** (Phase 3-4): US1 + US2 → ~25-30 hours → Deploy as v1.0
3. **Enhancement 1** (Phase 5): US3 Tracker Updates → ~8-10 hours → Deploy as v1.1
4. **Enhancement 2** (Phase 6): US4 History → ~6-8 hours → Deploy as v1.2
5. **Enhancement 3** (Phase 7): US5 Bulk Upload → ~8-10 hours → Deploy as v1.3
6. **Polish** (Phase 8): Cross-cutting improvements → ~8-10 hours → Deploy as v2.0

**Total Estimated Time**: 60-75 hours for full implementation

### Parallel Team Strategy

With 2-3 developers:

1. **Week 1**: Everyone on Foundation (Phase 1-2)
2. **Week 2-3**: 
   - Dev A: User Story 1 (core upload/OCR)
   - Dev B: User Story 2 (correction UI)
   - Dev C: Start on User Story 4 (history) foundations
3. **Week 4**: Integration testing, User Story 3 together
4. Complete US4 and US5 in parallel once US3 done

---

## Success Metrics Validation

After completing all tasks, validate against spec.md success criteria:

**Performance** (SC-001 to SC-004):
- [ ] Upload & preview: <3s (measure with console.time)
- [ ] OCR analysis: <15s for 20-40 items (measure with console.time)
- [ ] Tracker updates: <500ms (measure with console.time)

**Accuracy** (SC-005 to SC-008):
- [ ] OCR accuracy: ≥80% for well-lit screenshots (test with sample screenshots)
- [ ] Recommendation accuracy: 95%+ match quest/hideout needs (test with known items)
- [ ] False positive rate: <10% (test with sample screenshots)
- [ ] Support 1080p, 1440p, 4K resolutions (test across resolutions)

**User Experience** (SC-009 to SC-012):
- [ ] Full workflow: <90s end-to-end (manual timing)
- [ ] Corrections needed: ≤30% of items (test with sample screenshots)
- [ ] Correction time: <10s per item (manual timing)
- [ ] Time savings: 80% vs manual lookup (comparative test)

**Error Handling** (SC-013 to SC-015):
- [ ] Error messages: <3s response time
- [ ] Retry: <5s without re-upload
- [ ] Graceful degradation when OCR unavailable

**Integration** (SC-016 to SC-018):
- [ ] Persistence across page refresh
- [ ] No duplicate entries from multiple analyses
- [ ] Quantity accuracy: 90%+ when visible

---

## Notes

- **No automated tests**: Following existing project pattern (manual browser testing)
- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] labels**: Map tasks to user stories for traceability
- **Independent stories**: Each user story should be testable on its own
- **Commit frequently**: After each task or logical group
- **Stop at checkpoints**: Validate each story independently before moving on
- **File paths**: All paths assume repository root as base directory
- **MVP focus**: User Stories 1 & 2 deliver core value
- **Incremental**: Add US3-5 based on user feedback and priority
