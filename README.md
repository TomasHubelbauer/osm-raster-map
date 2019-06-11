# Seznam Maps

This project demonstrates the use of raster tiles from a publicly reachable, unauthenticated Mapy.cz tile server.

I've built it for fun and as a detour from trying to figure out a frustrating problem with vector tiles from a different source.

I generally believe raster tiles are inferior to vector tiles, but boy, are they easier to work with!

- Fix the mobile error/panning error
- Display a circle at the current location (initially the map center but it stays put with map panning and zooming) with accuracy radius
- Add support for placing points by GPS coordinates (pixels to GPS calculation)
- Persist map configuration (longitude, latitude, zoom) after each change to restore where left off
  (Possibly combine this with refactoring the map code to a class `Map` with events like onTileLoad, onTileRender etc.)
- Implement double left/right click to zoom in/out
- Implement pinch to zoom
- Improve the local storage cache so it evicts the least hit tile in favor or a new tile to persist
- Use a service worker for caching the commonly hit tiles by using a logic which eventually evicts tiles with low hits
- Consider using the OSM tile server or adding an option to switch to it or hosting my own rendered tiles hosted somewhere free
- Try to improve the loading algorithm so that it loads from the center out like Cinema4D bucket rendering (this may not be worth it)
- Refactor the map logic to a `Map` class with events for tile load (checker board) and tile render and provide multiple renderers:
  the current canvas based one (tiles and POIs rendered on canvas)
  and an image based one (tiles and POIs CSS placed)
  (Consider making it so that the renderer may opt into loading the tiles itself so the `img` based on could use checker board background
  image and let the `img` elements load the tiles)
- Benchmark the performance of the `canvas` and `img` based solutions somehow
  (DevTools FPS profile with programmatic pan/zoom sequence with clear cache?)
- Use `OffscreenCanvas` in the tile cache if supported (right now only Chrome)
