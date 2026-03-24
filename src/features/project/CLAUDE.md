# Project Feature

## Main API
- `ProjectOverlay` - Coordinates the map overlay, right-side tool card, and bottom panels.
- `BottomToolButtons` - Launch secondary panels such as the input editor and pathway timeline.

## Key Patterns
### DO: Keep bottom-launched feature panels inside the overlay content area
```jsx
{
  panelTransition((styles, item) =>
    item ? <animated.div style={styles}>...</animated.div> : null,
  );
}
```

### DO: Let the pathway panel use a taller, overflow-hidden container
```jsx
style={{ ...styles, overflow: 'hidden', borderRadius: 20 }}
```

### DO: Promote the pathway panel to a fixed overlay when full-screen editing is enabled
```jsx
style={{
  ...styles,
  position: 'fixed',
  top: 64,
  right: 12,
  bottom: 84,
  left: 12,
}}
```

### DO: Offer a resize handle in non-full-screen mode
```jsx
<button onMouseDown={handlePathwayResizeStart} aria-label="Resize pathway panel" />
```

### DO: Keep bottom tools mutually legible
```jsx
setInputEditor(false);
setShowPathwayPanel(true);
```

### DON'T: Replace the map for pathway editing
```jsx
// The pathway panel lives in the overlay so the map remains visible.
```

## Related Files
- `components/ProjectOverlay.jsx` - Main overlay layout and bottom-panel transitions.
- `components/Cards/BottomToolBottons/BottomToolButtons.jsx` - Bottom toolbar buttons.
