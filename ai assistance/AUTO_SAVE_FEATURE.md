# Auto-Save Feature Documentation

## Overview
The garden now automatically saves all changes when you navigate away, ensuring you never lose your work.

## What Gets Auto-Saved
- **All plants**: Position, model type, scale, and audio parameters (filter frequency, chorus depth, delay feedback)
- **Tempo settings**: Current BPM value
- **Ambient sound**: Currently selected ambient sound
- **Garden name**: When changed via the name modal

## When Auto-Save Triggers

### 1. **Navigation (Primary Trigger)** ✅
When you click the **Back button** or **Explore button**, the garden will:
1. Show a "Saving..." notification overlay
2. Save all current data to Firebase
3. Show "Saved!" confirmation
4. Navigate to the new page

**Visual Feedback**: Full-screen overlay with "Saving..." → "Saved!"

### 2. **Periodic Auto-Save** ⏰
Saves automatically every **30 seconds** if there are unsaved changes.

**No visual feedback** - silent background save.

### 3. **Tab Switch/Hide** 👁️
Saves when you switch to another browser tab or minimize the window.

**No visual feedback** - silent background save.

### 4. **Page Unload (Fallback)** 🚪
Attempts to save when the browser window is closed or page is refreshed.

**Note**: This is a fallback and may not always complete due to browser limitations.

## User Actions That Mark Changes

The following actions mark the garden as "having unsaved changes":

1. **Adding a plant** - Click "Add Random Note" button
2. **Editing a plant** - Drag the Y-axis handle to change size/animation
3. **Changing tempo** - Move the tempo slider
4. **Switching ambient sound** - Click any ambient sound icon

## Technical Details

### Change Tracking
```javascript
let hasUnsavedChanges = false; // Tracks if garden needs saving
let isSaving = false;          // Prevents concurrent saves
```

### Save Functions

**Manual Save** (via Save button):
- Shows save notification
- Plays save sound effect
- User-initiated

**Auto Save** (background):
- Silent (no notification)
- Triggered by events
- Prevents concurrent saves

### Navigation Interception
The system intercepts clicks on links with `data-transition="true"`:
```javascript
// Captures click events before transition.js
document.addEventListener("click", async (e) => {
  const link = e.target.closest('[data-transition="true"]');
  if (link && hasUnsavedChanges) {
    // Save first, then navigate
  }
}, true); // Capture phase
```

## Read-Only Mode

Auto-save is **disabled** when viewing another user's garden:
- No save attempts will be made
- Navigation is immediate (no save delay)
- Changes cannot be made anyway

## Known Limitations

1. **Page Refresh**: Browser may close page before save completes
   - **Solution**: Use periodic auto-save (every 30 seconds)

2. **Browser Crash**: Cannot save if browser crashes
   - **Solution**: Periodic auto-save minimizes data loss

3. **Network Issues**: Save may fail if offline
   - **Solution**: Error logged to console, navigation proceeds anyway

4. **Navigation Transition**: Direct navigation after save (no ink transition)
   - **Reason**: Ensures save completes before page unload

## Files Modified

### `src/js/garden.js`

**New Variables** (Lines ~336-338):
```javascript
let hasUnsavedChanges = false;
let isSaving = false;
```

**New Functions**:
- `markUnsavedChanges()` - Called when garden is modified
- `autoSaveGarden()` - Silent background save
- `setupAutoSave()` - Initializes auto-save event listeners

**Modified Functions**:
- `addRandomNote()` - Marks changes
- `updateTempo()` - Marks changes
- `exitPlantEditor()` - Marks changes (plant edited)
- `onHandleDragEnd()` - Marks changes (handle dragged)
- `AmbientSoundManager.switchSound()` - Marks changes
- `manualSaveGarden()` - Clears unsaved flag after save

## Testing Checklist

- [x] Add a plant → Click back button → Check Firebase (plant saved)
- [x] Change tempo → Click back button → Check Firebase (tempo saved)
- [x] Edit plant (drag handle) → Exit editor → Click back → Check Firebase (changes saved)
- [x] Switch ambient sound → Click back → Check Firebase (ambient saved)
- [x] Make changes → Wait 30 seconds → Check Firebase (periodic save works)
- [x] Make changes → Switch tab → Check Firebase (visibility save works)
- [x] No changes → Click back → Immediate navigation (no save delay)
- [x] Read-only mode → Click back → Immediate navigation (no save attempt)

## User Benefits

1. **Never lose work** - Changes saved automatically
2. **No manual saves needed** - Just play and leave
3. **Visual feedback** - Know when save is happening
4. **Graceful handling** - Even if save fails, navigation proceeds
5. **Efficient** - Only saves when changes exist

## Future Improvements

1. **Retry logic** - Retry failed saves with exponential backoff
2. **Offline support** - Queue saves when offline, sync when online
3. **Conflict resolution** - Handle concurrent edits from multiple devices
4. **Save history** - Keep version history of garden states
5. **Undo/redo** - Combined with auto-save for better UX
6. **Restore transition** - Find way to show transition animation while saving

---

**Implementation Date**: December 11, 2025
**Status**: ✅ Complete and Tested

