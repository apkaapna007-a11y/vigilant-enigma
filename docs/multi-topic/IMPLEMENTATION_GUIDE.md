# ChildBloom Rewriter - Multi-Topic Dashboard Enhancement

## Overview

This enhancement adds **batch processing capabilities** to the ChildBloom Rewriter dashboard while **preserving the existing single-topic workflow**. Users can now:

- Process **10-100+ topics in one session**
- Monitor **independent progress for each topic**
- **Pause/resume** batch operations
- **Retry failed topics** individually
- Download results **per-topic** or in bulk
- Switch between **single-article and batch-mode** seamlessly

## Architecture

### New Files to Add

```
components/
├── multi-topic-input.tsx          # Topic list UI with drag-reorder
├── multi-topic-processor.tsx      # Batch processing engine
└── upload-tab-enhanced.tsx        # New upload tab (replaces upload-tab.tsx)

lib/
└── types.ts                       # Extended with Topic, BatchJob types
```

### Modified Files

- `lib/types.ts` - Add multi-topic types
- `components/upload-tab.tsx` - Replace with enhanced version

### No Changes Required

- OpenAI client (`lib/openai-client.ts`)
- Prompts (`lib/prompts.ts`)
- History (`lib/history.ts`)
- Mode selector, streaming output, settings
- API routes (client-side only)

## Step-by-Step Implementation

### 1. Update Type Definitions

**File:** `lib/types.ts`

Add these new types after the existing `RewriteProgress` interface:

```typescript
export type TopicStatus = "pending" | "processing" | "completed" | "failed";
export type WritingMode = "contentforge" | "claude-seo";
export type OutputFormat = "cms-html" | "chirpy" | "clean-md";

export interface Topic {
  id: string;
  title: string;
  focusKeyword: string;
  status: TopicStatus;
  progress: number;
  sourceFileName?: string;
  sourceText?: string;
  result?: string;
  error?: string;
  wordCount?: number;
  createdAt: string;
  completedAt?: string;
}

export interface BatchJob {
  id: string;
  topics: Topic[];
  mode: WritingMode;
  outputFormat: OutputFormat;
  wordCount: number;
  authorName: string;
  genMode: "generate" | "rewrite";
  createdAt: string;
  completedAt?: string;
}
```

Add to `STORAGE_KEYS`:
```typescript
BATCH_JOBS: "cb_batch_jobs",
```

### 2. Add Multi-Topic Input Component

**File:** `components/multi-topic-input.tsx`

Provides:
- ✅ Add/remove topics
- ✅ Edit topic title & keyword inline
- ✅ Drag-and-drop reordering
- ✅ Per-topic file upload
- ✅ Visual status badges (pending/processing/completed/failed)
- ✅ Collapsible cards for space efficiency
- ✅ Error display per topic

**Key Features:**
- Topics stored in state, not localStorage (fast, interactive)
- Drag-drop reordering with visual feedback
- Expand/collapse to show full details
- File upload per topic with validation

### 3. Add Multi-Topic Processor Component

**File:** `components/multi-topic-processor.tsx`

Provides:
- ✅ Process All / Process Selected actions
- ✅ Pause / Resume / Cancel controls
- ✅ Real-time progress bars per topic
- ✅ Independent streaming for each topic
- ✅ Retry failed topics individually
- ✅ Completed results section (sortable, downloadable)
- ✅ Failed topics section with retry buttons
- ✅ Processing topics section with live progress

**Key Features:**
- Sequential processing (one topic at a time)
- Pause/resume without data loss
- Automatic saving to history on completion
- Independent progress tracking
- Selection UI for selective processing

### 4. Create Enhanced Upload Tab

**File:** `components/upload-tab-enhanced.tsx`

Replaces existing `upload-tab.tsx` with:

**Workflow Mode Toggle:**
- "Single Article" mode (existing behavior)
- "Batch Process" mode (new multi-topic)

**Single Article Mode:**
- ✅ Identical to existing upload tab
- ✅ All existing features preserved
- ✅ No breaking changes

**Batch Process Mode:**
- ✅ Global settings (author, word count, mode, format)
- ✅ Multi-topic input area
- ✅ Batch processor with progress summary
- ✅ Independent topic streaming

## Component Interaction Flow

```
UploadTab (enhanced)
├── Single Mode
│   └── [Existing single-topic flow]
│
└── Batch Mode
    ├── MultiTopicInput
    │   ├── Topic cards (add, edit, reorder)
    │   └── Per-topic file upload
    │
    └── MultiTopicProcessor
        ├── Progress summary (X/Y completed)
        ├── Process All / Selected / Retry buttons
        ├── Completed results section
        ├── Processing topics section
        └── Failed topics section
```

## State Management

### Topics Array Structure

```typescript
interface Topic {
  id: string;                    // Unique ID (topic_timestamp_random)
  title: string;                 // Article topic
  focusKeyword: string;          // SEO keyword
  status: TopicStatus;           // pending | processing | completed | failed
  progress: number;              // 0-100%
  sourceFileName?: string;       // Uploaded file name
  sourceText?: string;           // File or pasted content
  result?: string;               // Generated/rewritten content
  error?: string;                // Error message if failed
  wordCount?: number;            // Final word count
  createdAt: string;             // ISO timestamp
  completedAt?: string;          // ISO timestamp when done
}
```

### Processing Flow per Topic

1. **Pending** → User clicks "Process All" / "Process Selected"
2. **Processing** → (5%) Prep → (8%) Start streaming → (93%) Continue → (95%) Validate → (100%) Complete
3. **Completed** → Save to history, show in results section
4. **Failed** → Show error, enable retry button

## UI/UX Features

### Progress Summary Card
- Visual progress bar showing completed/processing/pending/failed breakdown
- Counter: "3/10 completed"
- Color-coded status indicators

### Topic Cards (Collapsed View)
- Status badge with icon
- Title + keyword preview
- Drag handle
- Progress bar (when processing)
- Expand/Edit/Delete buttons

### Topic Cards (Expanded View)
- Full edit form for title/keyword
- Source file preview + remove button
- File upload area with drag-drop
- Error display
- Result preview

### Completed Results Section
- Green header with icon
- List of completed topics
- Truncated result preview
- Copy button (with success feedback)
- Download button per topic

### Failed Topics Section
- Red header with icon
- Error message display
- Individual retry button
- Can retry one at a time or all at once

### Processing Section
- Blue header with spinning icon
- Live progress bar per topic
- Percentage indicator
- Real-time topic name

## Performance Considerations

### Speed Optimizations

1. **No localStorage reads during processing**
   - Results cached in state
   - Bulk save to history after completion

2. **Lazy rendering**
   - Topics in scrollable container (max-h-[60vh])
   - Result sections paginated/collapsible

3. **Independent streaming**
   - Each topic streams to its own state
   - No full-page re-renders per token

4. **Smart error handling**
   - One failed topic doesn't stop others
   - Isolated error state per topic

### Large Lists (50+ topics)

- Scrollable topic list with max height
- Collapsible cards by default (expand on demand)
- Result sections show top items first
- Pagination ready if needed

## API Integration

### No API Changes Required

The enhancement uses existing APIs:
- `OpenAIClient.streamRewrite()` - Already supports streaming
- `saveToHistory()` - Saves each topic result
- `buildSystemPrompt()`, `buildUserPrompt()` - Already generic
- `validateAndCleanOutput()` - Already topic-agnostic

### Sequential Processing

Topics process **one at a time** (configurable):
- Prevents rate-limiting issues
- Easier to debug
- Lower concurrent token usage
- Can be parallelized later if needed

## User Flows

### Single Article (Existing)

1. User enters topic, keyword, settings
2. Clicks "Generate Article"
3. Views live streaming output
4. Copies/downloads result
5. Result auto-saved to history

**No changes to this flow.**

### Batch Process (New)

1. Click "Batch Process" tab
2. Set global: author name, word count, mode, format
3. Click "Add Topic" multiple times
4. Fill in topic title + keyword for each
5. Optionally upload source files per topic
6. Click "Process All" or select and "Process Selected"
7. Watch live progress for each topic
8. View completed results as they arrive
9. Retry any failed topics
10. Download individual results or copy to clipboard

## Error Handling

### Input Validation

- Topic title required (>0 chars)
- Focus keyword required
- Source text required for rewrite mode (>50 chars)
- File validation same as existing

### Processing Errors

- API errors caught per-topic
- Error message stored and displayed
- Retry available without re-entering data
- Other topics continue processing

### Network Issues

- Pause/resume available
- Cancel stops all remaining topics
- Partially completed topics saved
- No data loss

## Testing Checklist

- [ ] Single article mode works (no regression)
- [ ] Batch mode: Add topics
- [ ] Batch mode: Edit topics
- [ ] Batch mode: Drag-reorder topics
- [ ] Batch mode: Upload files per topic
- [ ] Batch mode: Process All
- [ ] Batch mode: Process Selected (multi-select)
- [ ] Batch mode: Pause during processing
- [ ] Batch mode: Resume processing
- [ ] Batch mode: Cancel processing
- [ ] Batch mode: Completed results shown
- [ ] Batch mode: Failed results shown
- [ ] Batch mode: Retry individual failed topics
- [ ] Batch mode: Copy result to clipboard
- [ ] Batch mode: Download result
- [ ] History: All results saved
- [ ] Responsive: Mobile, tablet, desktop
- [ ] Performance: 50+ topics in list
- [ ] No memory leaks on rapid process/cancel

## Migration Notes

### For Existing Users

- Single-topic workflow completely unchanged
- New batch mode is opt-in (toggle button)
- No breaking changes to storage format
- Existing history still accessible

### Local Storage

- Existing `cb_history` unchanged
- New optional `cb_batch_jobs` (for future job persistence)
- Single and batch modes can coexist

## Future Enhancements

1. **Parallel processing** - Process 2-3 topics concurrently
2. **Scheduled batches** - Process at specific times
3. **Import from CSV** - Load 100+ topics from file
4. **Bulk operations** - Apply same template to all topics
5. **History filtering** - Filter by batch job
6. **Export batches** - Save/load batch configurations
7. **Advanced retry** - Retry with different settings per topic
8. **Analytics** - Completion rate, avg processing time

## Troubleshooting

### Topics not processing

- Check API key in Settings
- Verify topic has title + keyword
- Rewrite mode needs source text

### Results not saving

- Check browser storage quota
- History saved automatically on completion
- Can manually copy result

### Performance issues

- Close other tabs
- Reduce batch size
- Use "Process Selected" for smaller groups

### Pause/Resume stuck

- Click "Cancel" and restart
- Check browser console for errors

## Code Examples

### Processing a single topic programmatically

```typescript
const topic: Topic = {
  id: generateId(),
  title: "Newborn Care",
  focusKeyword: "newborn baby care",
  status: "pending",
  progress: 0,
  createdAt: new Date().toISOString(),
};

await processSingleTopic(topic, controller);
```

### Updating topic progress

```typescript
updateTopic(topicId, {
  status: "processing",
  progress: 50,
  result: partialText,
});
```

### Handling batch completion

```typescript
const completed = topics.filter((t) => t.status === "completed");
completed.forEach((topic) => {
  saveToHistory({
    id: generateId(),
    // ... map topic to ArticleRecord
  });
});
```

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API key and model settings
3. Test with single-article mode first
4. Review error messages on failed topics
5. Clear browser cache if UI glitches

## License

Same as ChildBloom Rewriter project.
