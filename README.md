# Seznam Maps

This project demonstrates the use of raster tiles from a publically reachable,
unauthenticated Mapy.cz tile server.

I've built it for fun and as a detour from trying to figure out a frustrating
problem with vector tiles from a different source.

I generally believe raster tiles are inferior to vector tiles, but boy, are
they easier to work with!

- Reuse the OSM GPS to tile indices algorithm without rounding to be able to show
  a circle at the found position within the tile (the fractional parts) with a
  radius based on the accuracy level
- Improve the cache so it evicts the least hit tile in favor or a new tile to persist
- Improve zooming by zooming around the center tile not the anchor tile
  Do this by changing `gpsX` and `gpxY` to be just offsets within the tile not the world.
  So they would have a range of 0 to 256. The `x` and `y` tile coordinates are the center of the map tile one's.
  Each time the map moves, the new center of the map tile gets promoted and these adjusted to match.
  The calculations that derive the top-left tile need to be adjusted accordingly as well.
  Some of the calculations will be simplified with `gpsX` and `gpxY` having range 0-256
  (tho we still need the modulo so probably not after all I guess).
  This will also preserve the view as the window gets resized (center stays center).
- Try to improve the loading algorithm so that it loads from the center out
  (Like Cinema4D when rendering)
- Create another demo which uses positioned `img` tags instead of `canvas`
  (Use `canvas` only for drawing)
