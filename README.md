# OSM Raster Tile Map

[**DEMO**](https://tomashubelbauer.github.io/osm-raster-map)

This project demonstrates the use of raster tiles from a publicly reachable, unauthenticated Mapy.cz tile server.

I've built it for fun and as a detour from trying to figure out a frustrating problem with vector tiles from a different source.

I generally believe raster tiles are inferior to vector tiles, but boy, are they easier to work with!

## To-Do

### Make double click to zoom in and out zoom so that the point stays under the cursor not in the center

### Seed location and zoom from storage but replace with live values when available

### Implement fractional zoom

### Export tracks as SVG for saving to Files on iOS

### Update locator POI in track mode

### Use `canvas` clipping to confine repainted POIs and strokes within the currently updated tile

https://www.w3schools.com/tags/canvas_clip.asp

### Hook up touch events for zoom in / out on double tap

### Add support for rotating the map (by UI buttons as well as `heading` from geo loc) - use `canvas` transforms

### Link server and tile size together so the HD one (512) and the others (256) work correctly

without specifying size in `drawImage`

### Persist pins & strokes in the local storage

### Put back drawing strokes on the map (canvas clip to tile being rerendered)

use https://stackoverflow.com/a/365853/2715716 to display the stroke length in km/m

### Persist map configuration (longitude, latitude, zoom) after each change to restore where left off

Possibly combine this with refactoring the map code to a class `Map` with events like onTileLoad, onTileRender etc.

### Implement pinch to zoom

### Refactor the map logic to a `Map` class with events for tile load (checker board) and tile render and provide multiple renderers:

The current canvas based one (tiles and POIs rendered on canvas) and an image based one (tiles and POIs CSS placed).
Consider making it so that the renderer may opt into loading the tiles itself so the `img` based on could use checker
board background image and let the `img` elements load the tiles.

### Benchmark the performance of the `canvas` and `img` based solutions somehow

DevTools FPS profile with programmatic pan/zoom sequence with clear cache?

### Use `OffscreenCanvas` in the tile cache if supported (right now only Chrome)

### Consider redrawing the whole canvas on each new tile load so that strokes and pins could be drawn once without getting clipped

### Check out http://tile.poloha.net/overlay/{zoom}/{x}/{y}.png

As per https://wiki.openstreetmap.org/wiki/WikiProject_Czech_Republic
