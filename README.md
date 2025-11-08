# OSM Raster Tile Map

[**DEMO**](https://tomashubelbauer.github.io/osm-raster-map)

This project demonstrates the use of raster tiles from OpenStreetMap.

I've built it for fun and as a detour from trying to figure out a frustrating problem with vector tiles from a different source.

I generally believe raster tiles are inferior to vector tiles, but boy, are they easier to work with!

## To-Do

### Make double click to zoom in and out zoom so that the point stays under the cursor not in the center

### Implement fractional zoom

### Hook up touch events for zoom in / out on double tap

### Add support for rotating the map (by UI buttons as well as `heading` from geo loc) - use `canvas` transforms

### Implement pinch to zoom

### Benchmark the performance of the `canvas` and `img` based solutions somehow

DevTools FPS profile with programmatic pan/zoom sequence with clear cache?

### Consider redrawing the whole canvas on each new tile load so that strokes and pins could be drawn once without getting clipped
