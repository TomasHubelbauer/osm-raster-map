window.addEventListener('load', async () => {
  const tileWidth = 256;
  const tileHeight = 256;

  let { latitude, longitude, zoom } = localStorage['map']
    ? JSON.parse(localStorage['map'])
    : await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(position => {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        const map = { longitude, latitude, zoom: 12 };
        localStorage['map'] = JSON.stringify(map);
        resolve(map);
      }, reject, { enableHighAccuracy: true })
    });

  const zoomInButton = document.getElementById('zoomInButton');
  zoomInButton.addEventListener('click', () => {
    if (zoom >= 18) {
      alert('This is the largest possible zoom');
    }

    zoom++;
    render();
  });

  const zoomOutButton = document.getElementById('zoomOutButton');
  zoomOutButton.addEventListener('click', () => {
    if (zoom <= 0) {
      alert('This is the smallest possible zoom');
    }

    zoom--;
    render();
  });

  let mode = 'browse';
  const modeButton = document.getElementById('modeButton');
  modeButton.addEventListener('click', () => {
    mode = mode === 'browse' ? 'draw' : 'browse';
    render();
  });

  const mapCanvas = document.getElementById('mapCanvas');

  let strokes = [];
  mapCanvas.addEventListener('pointerdown', event => {
    if (mode === 'draw') {
      strokes.push([longitude, latitude, event.offsetX, event.offsetY]);
      return;
    }
  });

  mapCanvas.addEventListener('pointermove', event => {
    if (event.buttons === 1) {
      if (mode === 'draw') {
        strokes[strokes.length - 1].push(event.offsetX, event.offsetY);
        render();
        return;
      }

      // Find the center tile longitude and latitude indices (the integral part) and the ratio of the longitude and latitude within them (the fractional part)
      const centerTileLongitudeNumber = (longitude + 180) / 360 * Math.pow(2, zoom);
      const centerTileLatitudeNumber = (1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

      // Transfer the change in canvas pixels to a change in tile numbers (multiples of tile size)
      let newCenterTileLongitudeNumber = centerTileLongitudeNumber + -event.movementX / tileWidth;
      let newCenterTileLatitudeNumber = centerTileLatitudeNumber + -event.movementY / tileHeight;

      // Calculate the new longitude using the reserve formula plugging in the adjusted tile longitude number
      longitude = newCenterTileLongitudeNumber / Math.pow(2, zoom) * 360 - 180;

      // Calculate the new latitude using the reserve formula plugging in the adjusted tile latitude number
      const n = Math.PI - 2 * Math.PI * newCenterTileLatitudeNumber / Math.pow(2, zoom);
      latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

      render();
    }
  });

  window.addEventListener('resize', render);

  let context;
  let canvasWidth;
  let canvasHeight;

  // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
  function render() {
    // Bust the context cache in case the dimensions have changed (window resize)
    if (canvasWidth !== mapCanvas.clientWidth || canvasHeight !== mapCanvas.clientHeight) {
      // Cache the context for the canvas dimensions for reuse across renders
      context = mapCanvas.getContext('2d');

      // Make the canvas grid match the canvas dimensions to avoid stretching
      mapCanvas.width = mapCanvas.clientWidth;
      mapCanvas.height = mapCanvas.clientHeight;

      // Remember the canvas dimensions the context belongs to
      canvasWidth = mapCanvas.width;
      canvasHeight = mapCanvas.height;
    }

    // Find the center point of the canvas that corresponds to the longitude and latitude of the position
    const centerPointCanvasX = canvasWidth / 2;
    const centerPointCanvasY = canvasHeight / 2;

    // Find the center tile longitude and latitude indices (the integral part) and the ratio of the longitude and latitude within them (the fractional part)
    const centerTileLongitudeNumber = (longitude + 180) / 360 * Math.pow(2, zoom);
    const centerTileLatitudeNumber = (1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

    // Find the point at which the GPS position point is within the tile it is contained within
    const centerPointTileX = (centerTileLongitudeNumber % 1) * tileWidth;
    const centerPointTileY = (centerTileLatitudeNumber % 1) * tileHeight;

    // Find the canvas position at which the center tile is placed (depends on where the position point is within the center tile, see above)
    const centerTileCanvasX = centerPointCanvasX - centerPointTileX;
    const centerTileCanvasY = centerPointCanvasY - centerPointTileY;

    // Find out how many visible columns of tiles there are before the center tile and from what canvas point (zero or negative) they go right
    const leftColumnsBeforeCenterCount = Math.ceil(centerTileCanvasX / tileWidth);
    const leftColumnTilesCanvasX = centerTileCanvasX - leftColumnsBeforeCenterCount * tileWidth;

    // Find out how many visible rows of tiles there are above the center tile and from what canvas point (zero or negative) they go down
    const topRowsBeforeCenterCount = Math.ceil(centerTileCanvasY / tileHeight);
    const topRowTilesCanvasY = centerTileCanvasY - topRowsBeforeCenterCount * tileHeight;

    // Find the map tile longitude index of the center tile and from it the left column tiles
    const centerTileLongitudeIndex = Math.floor(centerTileLongitudeNumber);
    const leftColumnTilesLongitudeIndex = centerTileLongitudeIndex - leftColumnsBeforeCenterCount;

    // Find the map tile latitude index of the center tile and from it the top row tiles
    const centerTileLatitudeIndex = Math.floor(centerTileLatitudeNumber);
    const topRowTilesLatitudeIndex = centerTileLatitudeIndex - topRowsBeforeCenterCount;

    // Find out how many tiles fit on the screen horizontall and vertically (varies depending on how first column and row are offset to the negative)
    const horizontalTileCount = Math.ceil((canvasWidth + -leftColumnTilesCanvasX) / tileWidth);
    const verticalTileCount = Math.ceil((canvasHeight + -topRowTilesCanvasY) / tileHeight);

    // Remember the values for which this render happens so that what the tiles are done being resolved asynchronously they can get discarded if the map moved meanwhile
    const renderLongitude = longitude;
    const renderLatitude = latitude;
    const renderZoom = zoom;

    for (let horizontalTileIndex = 0; horizontalTileIndex < horizontalTileCount; horizontalTileIndex++) {
      const tileCanvasX = leftColumnTilesCanvasX + horizontalTileIndex * tileWidth;
      const tileLongitudeIndex = leftColumnTilesLongitudeIndex + horizontalTileIndex;

      for (let verticalTileIndex = 0; verticalTileIndex < verticalTileCount; verticalTileIndex++) {
        const tileCanvasY = topRowTilesCanvasY + verticalTileIndex * tileHeight;
        const tileLatitudeIndex = topRowTilesLatitudeIndex + verticalTileIndex;

        // Draw a checker board pattern as a substrate for the tile while it is loading
        for (let x = 0; x < tileWidth / 8; x++) {
          for (let y = 0; y < tileHeight / 8; y++) {
            context.fillStyle = x % 2 === 0 ^ y % 2 === 0 ? 'silver' : 'white';
            context.fillRect(tileCanvasX + x * 8, tileCanvasY + y * 8, 8, 8);
          }
        }

        // Fire and forget without `await` so that tiles render in paralell, not sequentially
        getTile(tileLongitudeIndex, tileLatitudeIndex, zoom)
          .then(tile => {
            // Bail if the map has moved before this tile has been resolved
            if (renderLongitude !== longitude || renderLatitude !== latitude || renderZoom !== zoom) {
              return;
            }

            // Draw the tile image
            context.drawImage(tile, tileCanvasX, tileCanvasY);

            // TODO: Find the lines and line portions within this tile and redraw them
          })
          .catch(error => {
            // Bail if the map has moved before this tile has been rejected
            if (renderLongitude !== longitude || renderLatitude !== latitude || renderZoom !== zoom) {
              return;
            }

            // Render the error message crudely and indicate the error with a red substrate for the tile
            context.fillStyle = 'red';
            context.fillRect(tileCanvasX, tileCanvasY, tileWidth, tileHeight);
            context.fillText(error.toString(), tileCanvasX, tileCanvasY, tileWidth);
          })
          ;
      }
    }

    zoomInButton.disabled = zoom >= 18;
    zoomOutButton.disabled = zoom <= 0;
    document.getElementById('tileCooordSpan').textContent = `${latitude} ${longitude} ${zoom} | ${centerTileLongitudeIndex} ${centerTileLatitudeIndex} | ${leftColumnTilesLongitudeIndex}+${horizontalTileCount} ${topRowTilesLatitudeIndex}+${verticalTileCount}`;
    modeButton.textContent = mode === 'browse' ? 'Browsing mode. Switch to drawing' : 'Drawing mode. Switch to browsing';
  }

  // Render the initial map view
  render();
});

// TODO: Combine the `render` and `mousemove` handler code into one and memoize the intermediate results in class fields
class Map {
  render() {

  }
}

const tileCache = {};
const cacheCanvas = document.createElement('canvas');
function getTile(x, y, z) {
  const key = `${z}-${x}-${y}`;
  const promise = new Promise((resolve, reject) => {
    const tileImage = new Image();

    // See if we already have this tile in memory
    const match = tileCache[key] || localStorage[key];
    if (match) {
      // Wait if we do not have the tile yet but we are already downloading it
      if (match instanceof Promise) {
        match.then(resolve, reject);
        return;
      }

      // Convert Base64 data URI in local storage to image for returing
      if (typeof match === 'string') {
        let decodeResolve;
        let decodeReject;

        // Present a promise for the decoding to avoid duplicate work while decoding
        tileCache[key] = new Promise((resolve, reject) => {
          decodeResolve = resolve;
          decodeReject = reject;
        });

        // Load the image from the data URI in the local storage
        tileImage.src = match;

        tileImage.addEventListener('load', () => {
          resolve(tileImage);
          decodeResolve(tileImage);

          // Cache in memory
          tileCache[key] = tileImage;
          //console.log('Restored', key);
        });

        tileImage.addEventListener('error', event => {
          reject(event);
          decodeReject(event);
        });

        return;
      }

      // Resolve with the cached tile image
      resolve(match);
      return;
    }

    // Obtain the tile image asynchronously for caching
    tileImage.src = `https://mapserver.mapy.cz/base-m/${z}-${x}-${y}`;

    // Ensure CORS is disabled so that `context.drawImage` is not insecure
    tileImage.crossOrigin = 'anonymous';

    tileImage.addEventListener('load', () => {
      resolve(tileImage);

      // Cache in memory
      tileCache[key] = tileImage;

      // Cache in storage
      // TODO: Use OffscreenCanvas when supported
      cacheCanvas.width = tileImage.naturalWidth;
      cacheCanvas.height = tileImage.naturalHeight;

      const context = cacheCanvas.getContext('2d');
      context.drawImage(tileImage, 0, 0);

      try {
        localStorage.setItem(key, cacheCanvas.toDataURL());
        //console.log('Persisted', key);
      } catch (error) {
        //console.log('Memorized', key);
        // Ignore quota error, the user either gave or didn't give persistent storage permission
      }
    });

    tileImage.addEventListener('error', reject);
  });

  // Store the loading promise so that we know not to load it again while it loads and wait instead
  tileCache[key] = promise;
  return promise;
}
