# Notification Feature Documentation

## Overview
Added Apple/iPhone-style notifications that appear when users interact with upvote and bookmark buttons on both the directory and profile pages.

## Features

### ✅ Notification Types

**Success Notifications (Green):**
- Upvoting a profile: "Upvoted [Profile Name]! ▲"
- Bookmarking a profile: "[Profile Name] added to bookmarks"

**Info Notifications (Yellow):**
- Removing upvote: "Upvote removed from [Profile Name]"
- Removing bookmark: "[Profile Name] removed from bookmarks"

## Design

### Visual Style (Per User Preference)
- Clean, premium Apple/iPhone notification style
- White background with black border
- Rounded corners (8px border-radius)
- Shadow effect for depth
- Smooth slide-in animation from right
- Auto-dismiss after 3 seconds

### Colors
- **Success Icon**: Green circle (#299967) with white checkmark (✓)
- **Info Icon**: Yellow circle (#e3da71) with black info symbol (ℹ)
- **Background**: White (#FFFFFF)
- **Border**: Black 3px solid (#000000)
- **Text**: Black (#000000)

### Animation
```css
- Initial state: opacity: 0, translateX(400px)
- Show state: opacity: 1, translateX(0)
- Transition: 0.3s ease
- Duration: 3 seconds before auto-dismiss
```

## Implementation

### Files Modified

**1. styles.css**
- Added `.notification` class and variants
- Added `.notification-content`, `.notification-icon`, `.notification-message`
- Responsive styles for mobile (full width on small screens)

**2. script.js (Index Page)**
- Added `showNotification()` function
- Updated upvote button handler to show notifications
- Updated bookmark button handler to show notifications

**3. profile.js (Profile Page)**
- Added `showNotification()` function
- Updated upvote button handler to show notifications
- Updated bookmark button handler to show notifications

## Usage

### Function Signature
```javascript
showNotification(message, type = 'success')
```

**Parameters:**
- `message` (string): The notification text to display
- `type` (string): Either 'success' or 'info'

**Example:**
```javascript
showNotification('Profile saved successfully!', 'success');
showNotification('Changes discarded', 'info');
```

## User Experience Flow

### On Directory Page (spellcasters.html):
1. User clicks upvote button on a profile card
2. Upvote count increases/decreases
3. Notification slides in from right: "Upvoted [Name]! ▲"
4. Notification auto-dismisses after 3 seconds
5. Same flow for bookmark button

### On Profile Page (profile.html):
1. User clicks upvote button
2. Upvote count and section highlight changes
3. Notification appears: "Upvoted [Name]! ▲"
4. Auto-dismisses after 3 seconds
5. Same flow for bookmark button

## Responsive Design

### Desktop (> 768px):
- Fixed position: top-right corner (20px from edges)
- Width: 300px - 500px
- Slides in from right

### Mobile (≤ 480px):
- Fixed position: top (20px from top, 10px from sides)
- Full width (minus 20px margins)
- Slides in from right

## Technical Details

### Notification Lifecycle:
1. **Creation**: `createElement('div')` with notification HTML
2. **Injection**: `appendChild()` to document body
3. **Animation In**: Add `.show` class after 100ms
4. **Display**: Visible for 3 seconds
5. **Animation Out**: Remove `.show` class
6. **Cleanup**: Remove element from DOM after 300ms

### Z-Index:
- Notification: `z-index: 10000` (highest layer)
- Ensures notifications appear above all other content

### Multiple Notifications:
- Multiple notifications can appear simultaneously
- Each stacks on top of the previous one
- All auto-dismiss independently

## Accessibility

- Clear, readable text (14px Arial)
- High contrast (black text on white background)
- Icon + text for visual clarity
- Auto-dismiss prevents screen clutter
- Non-intrusive (doesn't block content)

## Future Enhancements (Optional)

1. **Notification Queue**: Stack multiple notifications vertically
2. **Manual Dismiss**: Add close button (X)
3. **Sound Effects**: Optional notification sound
4. **Persistence**: Store notification history
5. **Action Buttons**: "Undo" button for reversible actions
6. **Notification Center**: View all past notifications
7. **Custom Duration**: Different dismiss times per notification type

## Testing Checklist

### Desktop:
- [ ] Upvote notification appears (success)
- [ ] Remove upvote notification appears (info)
- [ ] Bookmark notification appears (success)
- [ ] Remove bookmark notification appears (info)
- [ ] Notification slides in smoothly
- [ ] Notification auto-dismisses after 3 seconds
- [ ] Multiple notifications work simultaneously
- [ ] Notification appears above all content

### Mobile:
- [ ] Notification is full-width
- [ ] Text is readable on small screens
- [ ] Animation works smoothly
- [ ] Doesn't interfere with scrolling
- [ ] Auto-dismiss works correctly

### Both Pages:
- [ ] Works on spellcasters.html (directory)
- [ ] Works on profile.html (individual profiles)
- [ ] Consistent styling across pages
- [ ] No console errors

## Summary

✅ **Implemented Features:**
- Apple/iPhone-style notifications
- Success (green) and info (yellow) variants
- Smooth slide-in/out animations
- Auto-dismiss after 3 seconds
- Fully responsive design
- Works on both directory and profile pages
- Shows profile name in notification message
- Clean, premium look matching site design

🎉 **Users now get clear visual feedback for all upvote and bookmark actions!**

