# ChildBloom Rewriter - Customization Snippets

Copy & paste these snippets to customize the multi-topic enhancement.

## 1. Enable Parallel Processing (3 Topics Concurrently)

**File**: `components/multi-topic-processor.tsx`

**Find** (line ~180):
```typescript
const processTopics = useCallback(
  async (topicIds: string[]) => {
    // ... validation code ...
    try {
      for (const id of topicIds) {
        if (controller.signal.aborted) break;
        // ... sequential processing ...
        await processSingleTopic(topic, controller);
      }
```

**Replace with**:
```typescript
// Install p-queue: npm install p-queue
import PQueue from 'p-queue';

const processTopics = useCallback(
  async (topicIds: string[]) => {
    // ... validation code ...
    try {
      const queue = new PQueue({ concurrency: 3 }); // 3 at a time
      
      await Promise.all(
        topicIds.map((id) =>
          queue.add(async () => {
            if (controller.signal.aborted) return;
            const topic = topics.find((t) => t.id === id);
            if (topic && topic.status === "pending") {
              await processSingleTopic(topic, controller);
            }
          })
        )
      );
```

**Tradeoffs**:
- ✅ 3x faster total time
- ❌ 3x API rate limit risk
- ❌ 3x higher API costs

## 2. Add Keyboard Shortcuts

**File**: `components/multi-topic-processor.tsx`

**Add to top** (after imports):
```typescript
import { useEffect } from 'react';

export function MultiTopicProcessor(...) {
  // ... existing code ...

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Enter: Process All
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleProcessAll();
      }
      
      // Space: Pause/Resume
      if (e.code === 'Space' && isProcessing) {
        e.preventDefault();
        setIsPaused(!isPaused);
      }
      
      // Escape: Cancel
      if (e.key === 'Escape' && isProcessing) {
        e.preventDefault();
        abortRef.current?.abort();
        setIsProcessing(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isProcessing, isPaused, handleProcessAll]);
```

**Add to UI** (near progress summary):
```typescript
<div className="text-xs text-muted-foreground space-y-0.5 p-2 rounded bg-muted/50">
  <div>⌘+Enter to Process All</div>
  <div>Space to Pause/Resume</div>
  <div>Esc to Cancel</div>
</div>
```

## 3. Dark Mode Toggle (if needed)

**File**: `components/multi-topic-input.tsx`

**Add support for dark mode badges**:
```typescript
const getStatusColor = (status: Topic["status"]) => {
  const lightColors = {
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };
  
  const darkColors = {
    pending: "dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
    processing: "dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
    completed: "dark:bg-green-900 dark:text-green-300 dark:border-green-700",
    failed: "dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  };
  
  return `${lightColors[status]} ${darkColors[status]}`;
};
```

## 4. Add Estimated Time Remaining

**File**: `components/multi-topic-processor.tsx`

**Add to state**:
```typescript
const [startTime, setStartTime] = useState<number | null>(null);
const [avgTimePerTopic, setAvgTimePerTopic] = useState(60000); // 60 sec default
```

**Calculate ETA**:
```typescript
const calculateETA = () => {
  if (!isProcessing || !startTime) return null;
  
  const elapsed = Date.now() - startTime;
  const completedSoFar = topics.filter(t => t.status === "completed").length;
  
  if (completedSoFar === 0) return null;
  
  const avgTime = elapsed / completedSoFar;
  const remaining = (topics.length - completedSoFar) * avgTime;
  
  return Math.ceil(remaining / 1000); // seconds
};

const etaSeconds = calculateETA();
```

**Display in UI**:
```typescript
{isProcessing && etaSeconds && (
  <div className="text-sm text-muted-foreground">
    ⏱️ Estimated {Math.floor(etaSeconds / 60)}:{(etaSeconds % 60).toString().padStart(2, '0')} remaining
  </div>
)}
```

## 5. Add Batch Export (CSV)

**File**: `components/multi-topic-processor.tsx`

**Add export function**:
```typescript
const exportResults = () => {
  const csv = [
    ['Topic', 'Keyword', 'Status', 'Word Count', 'Completed At'].join(','),
    ...completedTopics.map(t =>
      [
        `"${t.title}"`,
        `"${t.focusKeyword}"`,
        'Completed',
        t.wordCount || 0,
        t.completedAt ? new Date(t.completedAt).toLocaleString() : ''
      ].join(',')
    ),
    ...failedTopics.map(t =>
      [
        `"${t.title}"`,
        `"${t.focusKeyword}"`,
        'Failed',
        '',
        ''
      ].join(',')
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch_results_${new Date().toISOString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Add button**:
```typescript
<button
  onClick={exportResults}
  disabled={completedTopics.length === 0}
  className="px-4 py-2 rounded text-sm font-medium bg-muted hover:bg-muted/80"
>
  📊 Export Results (CSV)
</button>
```

## 6. Add Topic Deduplication

**File**: `components/multi-topic-input.tsx`

**Add to addTopic function**:
```typescript
const addTopic = () => {
  // Check for duplicates
  const titleExists = topics.some(
    t => t.title.toLowerCase().trim() === ""
  );
  
  if (titleExists && topics.length > 0) {
    alert("This topic already exists!");
    return;
  }
  
  const newTopic: Topic = {
    id: generateId(),
    title: "",
    focusKeyword: "",
    status: "pending",
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  onTopicsChange([...topics, newTopic]);
};
```

**Validate on save**:
```typescript
const saveEdit = (id: string) => {
  const trimmedTitle = editTitle.trim();
  
  // Check for duplicates
  const duplicate = topics.find(
    t => t.id !== id && 
         t.title.toLowerCase() === trimmedTitle.toLowerCase()
  );
  
  if (duplicate) {
    alert("A topic with this title already exists!");
    return;
  }
  
  updateTopic(id, {
    title: trimmedTitle,
    focusKeyword: editKeyword.trim(),
  });
  setEditingId(null);
};
```

## 7. Add Auto-Save to LocalStorage

**File**: `components/upload-tab-enhanced.tsx`

**Add effect**:
```typescript
useEffect(() => {
  if (workflowMode === 'multi' && topics.length > 0) {
    const timer = setTimeout(() => {
      // Save to a temporary draft
      localStorage.setItem('cb_batch_draft', JSON.stringify(topics));
    }, 2000); // Save after 2 sec of no changes
    
    return () => clearTimeout(timer);
  }
}, [topics, workflowMode]);

// Restore on mount
useEffect(() => {
  const draft = localStorage.getItem('cb_batch_draft');
  if (draft && topics.length === 0) {
    try {
      setTopics(JSON.parse(draft));
    } catch (e) {
      console.warn('Failed to restore draft:', e);
    }
  }
}, []);
```

**Add clear button**:
```typescript
<button
  onClick={() => {
    localStorage.removeItem('cb_batch_draft');
    setTopics([]);
  }}
  className="text-xs text-muted-foreground hover:text-foreground"
>
  Clear Draft
</button>
```

## 8. Add Progress Sound Notification

**File**: `components/multi-topic-processor.tsx`

**Add audio notif function**:
```typescript
const playSound = (type: 'success' | 'error') => {
  // Create sound with Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (type === 'success') {
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } else {
    oscillator.frequency.value = 400;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
};
```

**Call when topic completes**:
```typescript
updateTopic(topic.id, {
  status: "completed",
  progress: 100,
  result: finalText,
  wordCount: countWords(finalText),
  completedAt: new Date().toISOString(),
});

// Play sound (if user hasn't disabled notifications)
if (Notification.permission === 'granted') {
  playSound('success');
  new Notification('Topic Completed', {
    body: `${topic.title} finished processing`,
    tag: 'childbloom-processing'
  });
}
```

## 9. Add Topic Import from JSON

**File**: `components/multi-topic-input.tsx`

**Add import function**:
```typescript
const importTopics = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      
      if (!Array.isArray(data)) {
        alert('Invalid format: Expected array of topics');
        return;
      }
      
      const imported = data.map((item: any) => ({
        id: generateId(),
        title: item.title || item.name || '',
        focusKeyword: item.keyword || item.focusKeyword || '',
        status: 'pending' as const,
        progress: 0,
        createdAt: new Date().toISOString(),
      }));
      
      onTopicsChange([...topics, ...imported]);
      alert(`Imported ${imported.length} topics`);
    } catch (err) {
      alert('Failed to import: Invalid JSON file');
    }
  };
  
  reader.readAsText(file);
};
```

**Add import button**:
```typescript
<input
  type="file"
  accept=".json"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) importTopics(file);
    e.target.value = '';
  }}
  className="hidden"
  ref={importFileRef}
/>

<button
  onClick={() => importFileRef.current?.click()}
  className="px-3 py-1 text-xs rounded bg-muted hover:bg-muted/80"
>
  📥 Import JSON
</button>
```

**JSON Format**:
```json
[
  {
    "title": "Newborn Care",
    "keyword": "newborn baby care"
  },
  {
    "title": "Sleep Training",
    "keyword": "infant sleep training",
    "name": "Optional alternative"
  }
]
```

## 10. Add Batch Statistics Dashboard

**File**: `components/multi-topic-processor.tsx`

**Add stats calculation**:
```typescript
const calculateStats = () => {
  const completedTopics = topics.filter(t => t.status === 'completed');
  const totalWords = completedTopics.reduce((sum, t) => sum + (t.wordCount || 0), 0);
  const avgWords = completedTopics.length > 0 ? totalWords / completedTopics.length : 0;
  
  const elapsed = startTime ? Date.now() - startTime : 0;
  const avgTimePerTopic = completed > 0 ? elapsed / completed : 0;
  
  return {
    totalWords,
    avgWords: Math.round(avgWords),
    avgTime: Math.round(avgTimePerTopic / 1000),
    totalTopics: topics.length,
    completedCount: completed,
    successRate: Math.round((completed / topics.length) * 100)
  };
};

const stats = calculateStats();
```

**Display stats**:
```typescript
<div className="grid grid-cols-2 md:grid-cols-5 gap-2 rounded-lg border border-border bg-card/60 p-3">
  <div className="text-center">
    <p className="text-2xl font-bold text-blue-600">{stats.totalWords}</p>
    <p className="text-xs text-muted-foreground">Total Words</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold text-green-600">{stats.avgWords}</p>
    <p className="text-xs text-muted-foreground">Avg Words/Topic</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold text-amber-600">{stats.avgTime}s</p>
    <p className="text-xs text-muted-foreground">Avg Time</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold text-purple-600">{stats.successRate}%</p>
    <p className="text-xs text-muted-foreground">Success Rate</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold text-indigo-600">{stats.completedCount}/{stats.totalTopics}</p>
    <p className="text-xs text-muted-foreground">Completed</p>
  </div>
</div>
```

---

## Installation Notes

Some snippets require additional packages:

```bash
# For parallel processing
npm install p-queue

# All other snippets use built-in browser APIs
```

## Testing Each Customization

| Snippet | How to Test |
|---------|------------|
| Parallel processing | Process 5 topics, should finish in 1-2 min instead of 5-10 |
| Keyboard shortcuts | Try Ctrl+Enter, Space, Esc while processing batch |
| Dark mode | Check in dark theme, badges should be readable |
| ETA | Process 3+ topics, should show decreasing time estimate |
| Batch export | Click export button, download should open CSV |
| Deduplication | Add two topics with same title, second should be rejected |
| Auto-save draft | Refresh page, topics should still be there |
| Sound notification | Enable notifications, complete a topic |
| JSON import | Create JSON file with topics, import them |
| Statistics | Process batch, should show word counts and times |

## Performance Impact

| Customization | Performance | Notes |
|---------------|-----------|-------|
| Parallel (3x) | ❌ 3x API cost, ⚠️ Rate limits | Only if confident |
| Keyboard shortcuts | ✅ None | Instant feedback |
| Dark mode | ✅ None | CSS only |
| ETA calculation | ✅ <1ms | Lightweight math |
| CSV export | ✅ <10ms | Instant download |
| Deduplication | ✅ O(n) check | Fast for <100 topics |
| Auto-save | ⚠️ localStorage write | 2-3ms every 2 sec |
| Sound notification | ✅ Async | Non-blocking |
| JSON import | ✅ <100ms | One-time parse |
| Statistics | ✅ <5ms | Simple calculations |

---

**Tip**: Start with keyboard shortcuts (fastest to implement) and gradually add others based on user feedback.
