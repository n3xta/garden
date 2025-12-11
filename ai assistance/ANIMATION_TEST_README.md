# Plant Animation Test Page

## Purpose
This test page is designed to isolate and debug skeletal animation issues with plant models in the garden project.

## How to Use

### 1. Start a Local Server
You need to run a local server to load the GLB files. From the project root:

```bash
# If you have Python 3:
python -m http.server 8000

# Or if you have Node.js with http-server:
npx http-server -p 8000

# Or if you have PHP:
php -S localhost:8000
```

### 2. Open the Test Page
Navigate to: `http://localhost:8000/animation-test.html`

### 3. Test Controls

#### Select Plant Model
- Use the dropdown to load different plant models (1-35)
- Watch the info panel at the bottom to see:
  - Model loading status
  - Number of animation clips found
  - Number of skinned meshes
  - Number of bones in the skeleton

#### Animation Progress Slider
- **Purpose**: Manually scrub through the animation
- **Range**: 0.00 to 1.00 (0% to 100% of animation)
- **What to watch**: If the plant changes shape/pose as you move the slider, the animation is working!

#### Scale Controls (X, Y, Z)
- Test if scaling affects the skeletal animation
- **Expected behavior**: Plant should scale uniformly without leaves detaching

#### Play/Pause Button
- Plays the animation continuously in a loop
- Watch for smooth transitions
- **If animation doesn't play**: The model might not have animation data

#### Reset Button
- Resets all sliders to default values
- Useful for starting over with testing

## What to Look For

### ✅ Animation Working Correctly:
1. **Leaves stay attached to pot** when animation plays
2. **Smooth transitions** as you scrub the animation slider
3. **No console errors** (press F12 to open dev tools)
4. Info panel shows:
   - "Animation Clips: 1" (or more)
   - "Skinned Meshes: 1" (or more)
   - "Bones: > 0"

### ❌ Animation Issues:
1. **Leaves floating/separated** from the pot → Skeleton binding issue
2. **Animation slider doesn't change plant appearance** → Animation not applying
3. **Console errors** → JavaScript issues
4. **"No animation" in status** → Model lacks animation data

## Debugging Tips

### If Animation Doesn't Play:
1. Check console (F12) for errors
2. Verify the GLB file has animations
3. Try a different plant model
4. Check if "Animation Clips" shows > 0

### If Leaves Detach:
1. Check if scaling causes it (use scale sliders)
2. Watch during animation playback
3. Check console for skeleton-related errors
4. This indicates skeleton binding or matrix update issues

### Console Logging:
The page logs detailed information:
- SkinnedMesh detection
- Skeleton structure
- Animation clip details
- Bone counts

## Expected Models with Animation

Based on your setup, plant models should be in `/public/3d/plants/`:
- `1.glb`, `2.glb`, `3.glb`, etc. up to `35.glb`

Test with multiple models as not all may have animations.

## Integration with Main Garden

Once animation works correctly in this test page:
1. The same logic should work in `garden.js`
2. Compare the animation mixer setup
3. Verify the delta time is being passed correctly
4. Ensure skeleton updates happen automatically via mixer

## Technical Notes

### Key Differences from Main Garden:
- **Simplified scene**: No complex game logic
- **Direct control**: Manual animation time control
- **Visual feedback**: Real-time info display
- **Isolated testing**: No audio effects or Tone.js dependencies

### Three.js Animation Pipeline:
```
GLTFLoader 
  → AnimationClip 
  → AnimationMixer 
  → AnimationAction 
  → update(delta) 
  → Skeleton transforms 
  → SkinnedMesh vertices
```

## Common Issues & Fixes

### Issue: "Cannot read property 'value' of undefined"
**Fix**: Tone.js parameters in main garden - not relevant to this test page

### Issue: Skeleton not updating
**Fix**: Ensure `mixer.update(delta)` is called every frame with proper delta time

### Issue: Clone creates broken skeleton
**Fix**: Use `model.clone(true)` for deep clone, or use THREE.SkeletonUtils.clone()

### Issue: Animation time doesn't change appearance
**Fix**: Check if `action.paused = true` and ensure `mixer.update(0.001)` is called after setting time

## Need Help?

If you're still experiencing issues:
1. Check browser console for errors
2. Verify GLB file loads correctly
3. Test with different plant models
4. Compare working vs non-working models



