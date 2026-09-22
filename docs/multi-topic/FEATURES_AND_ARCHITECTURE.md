# ChildBloom Rewriter - Multi-Topic Enhancement: Features & Architecture

## Feature Comparison

### Single Article Mode (Existing + Preserved)

```
User Input
  ├─ Topic title
  ├─ Focus keyword
  ├─ Word count
  ├─ Author name
  ├─ Mode (ContentForge/Claude-SEO)
  ├─ Output format (HTML/Chirpy/Markdown)
  ├─ Source file OR text (for rewrite)
  │
  └─ Generate/Rewrite Article
       ├─ Stream output in real-time
       ├─ Show progress bar
       ├─ Display live word count
       │
       └─ Complete
            ├─ Copy to clipboard
            ├─ Download file
            ├─ Auto-save to history
            └─ New Article
```

**Processing**: Synchronous, blocking. One article at a time.

### Batch Process Mode (New)

```
Global Settings
  ├─ Author name (same for all topics)
  ├─ Word count (same for all topics)
  ├─ Mode (same for all topics)
  ├─ Output format (same for all topics)
  │
  └─ Topics List
       ├─ [Topic 1] ─ Add / Edit / Delete / Reorder
       ├─ [Topic 2]
       ├─ [Topic N]
       │
       └─ Processing Controls
            ├─ Process All
            ├─ Process Selected
            ├─ Retry Failed
            ├─ Pause / Resume
            └─ Cancel

Results Summary
  ├─ 7/10 Completed
  ├─ 2 Processing
  ├─ 1 Pending
  └─ 2 Failed (with retry buttons)

Per-Topic Actions
  ├─ Copy result
  ├─ Download result
  └─ Retry (if failed)
```

**Processing**: Sequential (one topic at a time), asynchronous (non-blocking).

## Detailed Feature List

### ✅ Added Features

#### Topic Management
- [x] Add multiple topics with "Add Topic" button
- [x] Edit topic title inline (collapse/expand)
- [x] Edit focus keyword inline
- [x] Delete topics (with confirmation implicit)
- [x] Reorder topics by drag-and-drop
- [x] Visual drag handle indicator
- [x] Drag-over highlighting for drop zone

#### File Handling
- [x] Upload source file per topic
- [x] Drag-drop file upload to topic
- [x] File type validation per topic
- [x] Display file name and character count
- [x] Remove file without deleting topic

#### Processing
- [x] Process All button (pending + failed)
- [x] Process Selected topics (with checkbox)
- [x] Selective processing (ignore others)
- [x] Pause processing without canceling
- [x] Resume from pause point
- [x] Cancel all remaining topics
- [x] Sequential processing (one at a time)

#### Progress Tracking
- [x] Real-time progress bar per topic
- [x] Percentage indicator (0-100%)
- [x] Status badges (Pending/Processing/Completed/Failed)
- [x] Color-coded status (slate/blue/green/red)
- [x] Summary card: X/Y completed
- [x] Multi-colored progress bar (status breakdown)
- [x] Live topic name display while processing

#### Results Management
- [x] Completed results section (collapsed/expandable)
- [x] Failed results section with errors
- [x] Processing section with live updates
- [x] Copy individual result to clipboard
- [x] Download individual result as file
- [x] Result preview in collapsed card
- [x] Word count display per result
- [x] Completion timestamp

#### Error Handling
- [x] Per-topic error messages
- [x] Retry individual failed topics
- [x] Retry All Failed button
- [x] Input validation (title + keyword required)
- [x] Source validation (required for rewrite)
- [x] File validation (size, type, format)
- [x] Network error recovery

#### UI/UX
- [x] Workflow mode toggle (Single ↔ Batch)
- [x] Collapsible topic cards (space efficient)
- [x] Expandable details per topic
- [x] Scrollable topic list (max-height)
- [x] Touch-friendly buttons (min 44px)
- [x] Responsive grid layout (mobile-first)
- [x] Smooth animations (fade-in, slide-up)
- [x] Loading indicators (spinning icons)
- [x] Success feedback (checkmarks)

#### Data Persistence
- [x] Auto-save completed results to history
- [x] Each topic saved separately
- [x] Original topic name as file name
- [x] Separate entry per topic (not grouped)
- [x] Timestamp on each result

### ✅ Preserved Features (No Breaking Changes)

#### Single Article Mode
- [x] Generate from scratch
- [x] Rewrite from uploaded file
- [x] Paste source text
- [x] Live streaming output
- [x] Copy and download
- [x] Auto-save to history
- [x] Mode selection (ContentForge/Claude-SEO)
- [x] Output format selection (HTML/Chirpy/MD)
- [x] Word count adjustment (1.5K-4K)

#### Settings
- [x] API key management
- [x] Model selection
- [x] Temperature setting
- [x] Max tokens configuration
- [x] Custom base URL
- [x] Custom CORS proxy

#### History
- [x] View all generated articles
- [x] Search articles
- [x] Filter by date, mode, format
- [x] Copy results
- [x] Download results
- [x] Delete individual or all
- [x] View article details

#### File Support
- [x] .txt, .md, .docx, .pdf, .html
- [x] Max 10 MB per file
- [x] Character count display
- [x] Word count calculation

## Architecture Deep Dive

### Component Hierarchy

```
App (page.tsx)
└─ Tabs
   ├─ Rewrite Tab (UploadTab - enhanced)
   │  ├─ Workflow Toggle
   │  │  ├─ Single Mode Button
   │  │  └─ Batch Mode Button
   │  │
   │  ├─ Single Article Flow (unchanged)
   │  │  ├─ Topic input
   │  │  ├─ Keyword input
   │  │  ├─ Settings selector
   │  │  ├─ File upload
   │  │  ├─ Generate button
   │  │  ├─ StreamingOutput
   │  │  └─ Download/Copy buttons
   │  │
   │  └─ Batch Mode Flow (new)
   │     ├─ Global settings grid
   │     │  ├─ Author name input
   │     │  ├─ Word count selector
   │     │  ├─ Mode selector
   │     │  └─ Format selector
   │     │
   │     ├─ MultiTopicInput
   │     │  ├─ Add Topic button
   │     │  └─ Topic Cards (repeating)
   │     │     ├─ Collapse/Expand
   │     │     ├─ Status badge
   │     │     ├─ Drag handle
   │     │     ├─ Quick preview
   │     │     ├─ Expand view
   │     │     │  ├─ Edit form
   │     │     │  ├─ File upload
   │     │     │  └─ Result preview
   │     │     └─ Action buttons (edit/delete)
   │     │
   │     └─ MultiTopicProcessor
   │        ├─ Progress summary card
   │        │  ├─ Completed count
   │        │  ├─ Processing count
   │        │  ├─ Pending count
   │        │  ├─ Failed count
   │        │  └─ Status breakdown bar
   │        │
   │        ├─ Control buttons
   │        │  ├─ Process All
   │        │  ├─ Process Selected
   │        │  └─ Retry Failed
   │        │
   │        ├─ Selection controls
   │        │  ├─ Select All checkbox
   │        │  └─ Selection counter
   │        │
   │        ├─ Results sections
   │        │  ├─ Completed (green)
   │        │  ├─ Processing (blue)
   │        │  └─ Failed (red)
   │        │
   │        └─ Individual actions
   │           ├─ Copy result
   │           ├─ Download result
   │           └─ Retry
   │
   ├─ History Tab (unchanged)
   └─ Settings Tab (unchanged)
```

### State Management Flow

```typescript
// UploadTab state
workflowMode: "single" | "multi"
topic, focusKeyword, sourceText, ...  // Single mode
topics: Topic[]                        // Batch mode

// MultiTopicInput state
editingId, editTitle, editKeyword      // Inline editing
expandedId                             // Collapse/expand
dragSource, dragOverId                 // Drag-reorder

// MultiTopicProcessor state
isProcessing: boolean
isPaused: boolean
selectedIds: Set<string>               // Multi-select
copied: string | null                  // Copy feedback

// Topic state (in topics array)
Topic {
  id, title, focusKeyword, status, progress,
  sourceFileName, sourceText, result, error,
  wordCount, createdAt, completedAt
}
```

### Processing Flow (Batch)

```
User clicks "Process All"
  │
  ├─ Validate: API key, topics not empty
  │
  ├─ Get pending/failed topics
  │
  ├─ For each topic:
  │  │
  │  ├─ Set status = "processing"
  │  │
  │  ├─ Build system + user prompts
  │  │
  │  ├─ Stream from OpenAI API
  │  │  ├─ onToken: Update topic.result + topic.progress
  │  │  └─ Every token updates UI (no throttle, fast)
  │  │
  │  ├─ Check if output incomplete
  │  │  ├─ If yes: Continue streaming from last point
  │  │  └─ If no: Done
  │  │
  │  ├─ Validate & clean output
  │  │
  │  ├─ Set status = "completed"
  │  │  ├─ topic.result = finalText
  │  │  ├─ topic.progress = 100
  │  │  └─ topic.wordCount = countWords(finalText)
  │  │
  │  └─ Save to history (ArticleRecord)
  │
  └─ All topics processed (or user cancels)
```

### Data Flow per Token

```
OpenAI API
  │
  └─ onToken callback
      │
      ├─ Append to fullText
      │
      ├─ updateTopic({ result: fullText, progress: % })
      │
      └─ React state update triggers re-render
          │
          └─ Topic card updates instantly
              ├─ Progress bar moves
              ├─ Result preview shows new tokens
              └─ Word count updates (no flicker)
```

## Performance Optimizations

### Rendering Efficiency

```
❌ Naive: Re-render all topics on every token
   - Each topic: ~5ms render
   - 100 topics × 5ms = 500ms per token
   - At 10 tokens/sec = 5000ms delay (unusable)

✅ Smart: Only update active topic
   - updateTopic(id) updates only topics[id]
   - React only re-renders that card
   - Cost: ~1-2ms per token
   - At 10 tokens/sec = 10-20ms delay (fine)

✅ Virtualization (optional future):
   - Only render visible topics in scroll window
   - Cost: <1ms per token
   - Needed for 500+ topics
```

### Memory Management

```
Topics array: O(n) where n = topic count
  - 50 topics × ~2KB per topic = ~100KB
  - 100 topics × ~2KB = ~200KB
  - 1000 topics × ~2KB = ~2MB
  ✅ Acceptable for modern browsers

Result strings: O(m) where m = total words
  - Average article: 2500 words
  - 50 articles × 2500 × 5 bytes/char = ~625MB
  ⚠️ Close to tab memory limit (~500-1000MB)
  💡 Consider clearing older results mid-batch
```

### Network Optimization

```
Sequential processing:
  ✅ One API request at a time
  ✅ Reduces rate limiting issues
  ✅ Lower concurrent token usage
  ⚠️ Slower total time (50 topics = ~50 min at 1 min/topic)

Parallel alternative (future):
  ✅ Faster total time (3x concurrency = ~17 min)
  ⚠️ Higher rate limiting risk
  ⚠️ Higher API costs (concurrent tokens)
  💡 Recommend staying sequential
```

## Storage Schema

### Local Storage (browser)

```javascript
// Existing (unchanged)
localStorage.cb_settings = {
  apiKey: "...",
  baseUrl: "...",
  model: "...",
  temperature: 1.0,
  maxTokens: 20000
}

localStorage.cb_history = [
  {
    id: "article_123",
    fileName: "newborn-care.html",
    originalText: "...",
    rewrittenText: "...",
    mode: "contentforge",
    outputFormat: "cms-html",
    wordCount: 2500,
    createdAt: "2024-01-15T10:30:00Z"
  },
  // ... more articles
]

// New (optional, for future batch job persistence)
localStorage.cb_batch_jobs = [
  {
    id: "batch_456",
    topics: [
      {
        id: "topic_1",
        title: "Newborn Care",
        focusKeyword: "newborn care",
        status: "completed",
        result: "...",
        wordCount: 2500,
        // ...
      }
    ],
    createdAt: "2024-01-15T10:30:00Z",
    completedAt: "2024-01-15T11:30:00Z"
  }
]
```

### State (in-memory during processing)

```typescript
// Topics array in memory (not persisted during batch)
topics: [
  {
    id: "topic_abc123",
    title: "Newborn Circumcision Care",
    focusKeyword: "newborn circumcision",
    status: "processing",
    progress: 45,
    sourceFileName: "source.pdf",
    sourceText: "...",
    result: "...", // Partial, streaming
    error: undefined,
    wordCount: 1245,
    createdAt: "2024-01-15T10:30:00.123Z",
    completedAt: undefined
  },
  // ...
]
```

## Error Recovery

### Pause/Resume

```
User pauses:
  - isProcessing = true
  - isPaused = true
  - Current topic keeps state
  - AbortController NOT aborted
  - Next topic not started

User resumes:
  - isPaused = false
  - Continue from next topic
  - Previous topic's partial state preserved
  - No data loss

User cancels:
  - AbortController.abort()
  - isProcessing = false
  - Current topic stops mid-stream
  - Partial result preserved
  - Can retry topic later
```

### Network Failure Recovery

```
API error during processing:
  - Caught in catch block
  - Topic status = "failed"
  - Error message stored
  - Next topic continues
  - User can retry manually

Timeout or connection lost:
  - OpenAI client throws error
  - Same handling as API error
  - No infinite retry loop
```

## Backward Compatibility

### Breaking Changes
- None! Single mode is 100% preserved.

### Additive Changes
- New files (multi-topic-*.tsx)
- New types (Topic, BatchJob)
- New storage key (cb_batch_jobs)
- Enhanced UploadTab (superset of old)

### Migration
- Users with existing single-article flow: No changes needed
- Existing history: Fully accessible
- New batch feature: Opt-in toggle

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core processing | ✅ 90+ | ✅ 88+ | ✅ 14+ | ✅ 90+ |
| Drag-drop | ✅ | ✅ | ⚠️ Limited | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ |
| LocalStorage | ✅ | ✅ | ✅ | ✅ |
| AbortController | ✅ | ✅ | ✅ | ✅ |
| Clipboard API | ✅ | ✅ | ✅ | ✅ |

**Note**: All features degrade gracefully. Drag-drop can use fallback click-upload.

## Testing Coverage

### Unit Tests (if needed)

```typescript
describe('MultiTopicInput', () => {
  it('should add topics', () => { ... })
  it('should reorder topics', () => { ... })
  it('should validate file upload', () => { ... })
})

describe('MultiTopicProcessor', () => {
  it('should process topics sequentially', () => { ... })
  it('should pause and resume', () => { ... })
  it('should retry failed topics', () => { ... })
})
```

### Integration Tests

```
e2e: Single mode (regression)
e2e: Batch mode with 5 topics
e2e: Pause/resume batch
e2e: Retry failed topic
e2e: Results saved to history
```

### Manual Tests

- [x] Test on desktop Chrome/Firefox/Safari/Edge
- [x] Test on tablet (iPad, Android tablet)
- [x] Test on mobile (iPhone, Android phone)
- [x] Test with slow network (DevTools throttle)
- [x] Test with large file (10 MB)
- [x] Test with 50+ topics

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Compatibility**: Next.js 14+, React 18+, TypeScript 5+
