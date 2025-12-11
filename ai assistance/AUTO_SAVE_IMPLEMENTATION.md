# Auto-Save Implementation

## Overview

The garden now automatically saves all plants, environmental parameters, and settings when the user exits or switches tabs. This ensures no data is lost even if the user forgets to manually save.

## Features Implemented

### 1. Auto-Save Triggers

The garden auto-saves in the following scenarios:

#### **On Page Exit** (`beforeunload` event)
- Automatically saves when user closes the tab/window
- Saves when user navigates to a different page
- Works with browser close, refresh, or navigation

#### **On Tab Switch** (`visibilitychange` event)
- Automatically saves when user switches to another tab
- Ensures changes are saved even if user doesn't return

#### **Periodic Auto-Save** (every 30 seconds)
- Background auto-save runs every 30 seconds
- Only saves if there are unsaved changes
- Prevents excessive database writes

### 2. Change Tracking

The system intelligently tracks when changes are made:

| Action | Tracked |
|--------|---------|
| **Add Plant** | ✅ When random note/plant is added |
| **Edit Plant** | ✅ When plant editor is closed (scale/animation changes) |
| **Change Tempo** | ✅ When tempo slider is adjusted |
| **Switch Ambient Sound** | ✅ When ambient sound is selected |
| **Rename Garden** | ✅ Saved separately (no auto-save needed) |

### 3. Data Saved

All auto-saves include:

- **Plants Array**
  - Track and step position
  - Plant model index
  - Audio parameters (filter frequency, chorus depth, delay feedback)
  - Scale (x, y, z)
  - Animation progress

- **Tempo** (BPM value)

- **Ambient Sound** (current ambient sound selection)

- **Metadata**
  - Updated timestamp
  - Owner username

### 4. Smart Saving

- **Read-Only Protection**: Auto-save is disabled in read-only mode (viewing other users' gardens)
- **Change Detection**: Only saves when there are actual unsaved changes
- **Save Throttling**: Prevents multiple simultaneous saves with `isSaving` flag
- **Silent Operation**: Auto-saves happen in the background without UI notifications

## Code Structure

### New Variables

```javascript
let hasUnsavedChanges = false;  // Tracks if there are unsaved changes
let isSaving = false;            // Prevents concurrent saves
```

### Key Functions

#### `markUnsavedChanges()`
Sets the flag indicating unsaved changes exist.

#### `autoSaveGarden()`
Performs a silent save operation without UI notifications.
- Checks for read-only mode
- Checks for unsaved changes
- Prevents concurrent saves
- Saves to Firebase Firestore
- Resets the unsaved changes flag on success

#### `setupAutoSave()`
Initializes all auto-save event listeners:
- `beforeunload` event
- `visibilitychange` event
- 30-second interval timer

### Integration Points

Auto-save tracking is integrated at these points:

1. **`addRandomNote()`** - After successfully adding a plant
2. **`updateTempo()`** - After changing tempo
3. **`exitPlantEditor()`** - After closing plant editor
4. **`AmbientSoundManager.switchSound()`** - After changing ambient sound

## User Experience

### Before (Manual Save Only)
- Users had to remember to click the save button
- Risk of losing work if tab closed accidentally
- No save on tab switch
- Data lost on browser crash

### After (Auto-Save)
- Seamless background saving
- No lost work on tab close/switch
- Periodic saves ensure minimal data loss
- Manual save button still available for explicit saves
- Visual feedback only on manual saves

## Technical Details

### Firebase Integration

Uses Firebase Firestore with:
- Collection: `gardens`
- Document ID: `currentUser.uid`
- Method: `setDoc()` with `{ merge: true }`

### Browser Compatibility

- **Modern Browsers**: Full support for all auto-save features
- **`beforeunload`**: Supported in all major browsers
- **`visibilitychange`**: Supported in Chrome, Firefox, Safari, Edge

### Performance

- **Minimal Overhead**: Only saves when changes detected
- **Non-Blocking**: All saves are asynchronous
- **Efficient**: 30-second interval prevents excessive writes
- **Cost-Effective**: Firebase writes only occur when needed

## Testing Checklist

- [✓] Add a plant → Auto-save should trigger on exit
- [✓] Change tempo → Auto-save should trigger on exit
- [✓] Edit plant scale → Auto-save should trigger on exit
- [✓] Switch ambient sound → Auto-save should trigger on exit
- [✓] Switch tabs → Auto-save should trigger immediately
- [✓] Wait 30 seconds with changes → Auto-save should trigger
- [✓] Read-only mode → Auto-save should NOT trigger
- [✓] Close tab → Changes should be saved
- [✓] Manual save → Still works with notification

## Future Enhancements

Possible improvements:

1. **Visual Indicator**: Show "Saving..." or "All changes saved" status
2. **Conflict Resolution**: Handle concurrent edits from multiple tabs
3. **Offline Support**: Queue saves when offline, sync when online
4. **Undo/Redo**: Track change history for undo functionality
5. **Save Debouncing**: Debounce rapid changes (e.g., tempo slider dragging)
6. **Version History**: Keep snapshots of previous garden states

## Known Limitations

1. **`beforeunload` Timing**: Browser may not wait for async save to complete
   - Mitigated by: visibilitychange event and periodic saves
   
2. **No Plant Deletion**: Currently no way to delete plants
   - When implemented, will need to call `markUnsavedChanges()`

3. **Rapid Changes**: Very rapid changes (< 30s) rely on exit events
   - Acceptable given 30-second periodic save

## Migration Notes

- **Backward Compatible**: Existing manual save functionality unchanged
- **No Database Changes**: Uses existing Firestore structure
- **No User Action Required**: Auto-save works automatically

---

**Implementation Date**: December 2025  
**File Modified**: `src/js/garden.js`  
**Status**: ✅ Implemented & Tested

