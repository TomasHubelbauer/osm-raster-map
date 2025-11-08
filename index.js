const tileWidth = 256;
const tileHeight = 256;
const tileCache = {};

/** @type {GeolocationCoordinates | undefined} */
let liveCoords;

/** @type {GeolocationCoordinates | undefined} */
let mapCoords;

let zoom = 10;

navigator.geolocation.watchPosition(
  position => {
    liveCoords = position.coords;
    if (!mapCoords) {
      mapCoords = {
        longitude: liveCoords.longitude,
        latitude: liveCoords.latitude,
      };
    }

    render();
  },
  error => {
    alert('Unable to track live position: ' + error.code + ' ' + error.message);
  },
  { enableHighAccuracy: true },
);

/** @type {{ type: 'locator', longitude: number, latitude: number, accuracy: number }} */
const pois = [];
document.getElementById('poisSpan').textContent = pois.length + (pois.length === 1 ? ' poi' : ' pois');

const zoomInButton = document.getElementById('zoomInButton');
zoomInButton.addEventListener('click', () => {
  if (zoom >= 18) {
    alert('This is the largest possible zoom');
  }

  zoom++;
  document.getElementById('zoomSpan').textContent = zoom;
  render();
});

const zoomOutButton = document.getElementById('zoomOutButton');
zoomOutButton.addEventListener('click', () => {
  if (zoom <= 0) {
    alert('This is the smallest possible zoom');
  }

  zoom--;
  document.getElementById('zoomSpan').textContent = zoom;
  render();
});

let mode = 'browse';
const modeButton = document.getElementById('modeButton');
modeButton.textContent = mode === 'browse' ? 'Browsing mode. Switch to drawing' : 'Drawing mode. Switch to browsing';
modeButton.addEventListener('click', () => {
  mode = mode === 'browse' ? 'draw' : 'browse';
  modeButton.textContent = mode === 'browse' ? 'Browsing mode. Switch to drawing' : 'Drawing mode. Switch to browsing';
  render();
});

const mapCanvas = document.getElementById('mapCanvas');

let pointerX;
let pointerY;
let pointerLongitude;
let pointerLatitude;

const doubleClickThreshold = 250; // ms
let strokes = [];
  /** @type{(undefined | { button: number; timestamp: number; timeout: number; x: number; y: number; })} */ let lastClick;
mapCanvas.addEventListener('pointerdown', event => {
  if (mode === 'draw') {
    strokes.push([pointerLongitude, pointerLatitude]);
    return;
  }

  let timeout;
  switch (event.buttons) {
    case 1: {
      if (lastClick && lastClick.button === 1 && event.timeStamp - lastClick.timestamp < doubleClickThreshold) {
        // Cancel the primary single click action as this turned out to be a double click
        window.clearTimeout(lastClick.timeout);

        if (zoom < 18) {
          mapCoords.longitude = pointerLongitude;
          mapCoords.latitude = pointerLatitude;
          document.getElementById('centerCoordsSpan').textContent = `${mapCoords.longitude.toFixed(4)} ${mapCoords.latitude.toFixed(4)}`;

          zoom++;
          document.getElementById('zoomSpan').textContent = zoom;
          render();
        }
      } else {
        // Schedule a primary button click handler which will fire until this click turns into a double click
        timeout = window.setTimeout(() => {
          if (!lastClick || lastClick.x !== pointerX || lastClick.y !== pointerY) {
            // Discard the single click as the mouse moved between the press and release (drag)
            return;
          }

          pois.push({ type: 'pin', longitude: pointerLongitude, latitude: pointerLatitude });
          document.getElementById('poisSpan').textContent = pois.length + (pois.length === 1 ? ' poi' : ' pois');
          render();
        }, doubleClickThreshold + 10);
      }

      break;
    }
    case 2: {
      if (lastClick && lastClick.button === 2 && event.timeStamp - lastClick.timestamp < doubleClickThreshold) {
        // Cancel the secondary single click action as this turned out to be a double click
        window.clearTimeout(lastClick.timeout);

        if (zoom > 0) {
          mapCoords.longitude = pointerLongitude;
          mapCoords.latitude = pointerLatitude;
          document.getElementById('centerCoordsSpan').textContent = `${mapCoords.longitude.toFixed(4)} ${mapCoords.latitude.toFixed(4)}`;

          zoom--;
          document.getElementById('zoomSpan').textContent = zoom;
          render();
        }
      } else {
        // Schedule a secondary button click handler which will fire until this click turns into a double click
        timeout = window.setTimeout(() => {
          if (!lastClick || lastClick.x !== pointerX || lastClick.y !== pointerY) {
            // Discard the single click as the mouse moved between the press and release (drag)
            return;
          }

          mapCoords.longitude = pointerLongitude;
          mapCoords.latitude = pointerLatitude;
          document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
          render();
        }, doubleClickThreshold + 10);
      }

      break;
    }
  }

  lastClick = { button: event.buttons, timestamp: event.timeStamp, timeout, x: event.clientX, y: event.clientY };
});

mapCanvas.addEventListener('pointermove', event => {
  if (!mapCoords) {
    return;
  }

  pointerX = event.clientX;
  pointerY = event.clientY;
  document.getElementById('pointerPointsSpan').textContent = `${pointerX} ${pointerY}`;

  // Find the center tile longitude and latitude indices (the integral part) and the ratio of the longitude and latitude within them (the fractional part)
  const centerTileLongitudeNumber = (mapCoords.longitude + 180) / 360 * Math.pow(2, zoom);
  const centerTileLatitudeNumber = (1 - Math.log(Math.tan(mapCoords.latitude * Math.PI / 180) + 1 / Math.cos(mapCoords.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

  const centerDifferenceX = pointerX - canvasWidth / 2;
  const centerDifferenceY = pointerY - canvasHeight / 2;

  // Transfer the difference in canvas pixels to a difference in tile numbers (multiples of tile size)
  let pointerTileLongitudeNumber = centerTileLongitudeNumber + centerDifferenceX / tileWidth;
  let pointerTileLatitudeNumber = centerTileLatitudeNumber + centerDifferenceY / tileHeight;

  // Calculate the new longitude using the reserve formula plugging in the adjusted tile longitude number
  pointerLongitude = pointerTileLongitudeNumber / Math.pow(2, zoom) * 360 - 180;

  // Calculate the new latitude using the reserve formula plugging in the adjusted tile latitude number
  const pointerN = Math.PI - 2 * Math.PI * pointerTileLatitudeNumber / Math.pow(2, zoom);
  pointerLatitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(pointerN) - Math.exp(-pointerN)));

  document.getElementById('pointerCoordsSpan').textContent = `${pointerLongitude.toFixed(4)} ${pointerLatitude.toFixed(4)}`;

  if (event.buttons === 1) {
    if (mode === 'draw') {
      strokes[strokes.length - 1].push(event.offsetX, event.offsetY);
      render();
      return;
    }

    // Transfer the change in canvas pixels to a change in tile numbers (multiples of tile size)
    let newCenterTileLongitudeNumber = centerTileLongitudeNumber + -event.movementX / tileWidth;
    let newCenterTileLatitudeNumber = centerTileLatitudeNumber + -event.movementY / tileHeight;

    // Calculate the new longitude using the reserve formula plugging in the adjusted tile longitude number
    mapCoords.longitude = newCenterTileLongitudeNumber / Math.pow(2, zoom) * 360 - 180;

    // Calculate the new latitude using the reserve formula plugging in the adjusted tile latitude number
    const n = Math.PI - 2 * Math.PI * newCenterTileLatitudeNumber / Math.pow(2, zoom);
    mapCoords.latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    document.getElementById('centerCoordsSpan').textContent = `${mapCoords.longitude.toFixed(4)} ${mapCoords.latitude.toFixed(4)}`;
    render();
  }
});

let lastTouch;
mapCanvas.addEventListener('touchmove', event => {
  pointerX = event.touches[0].clientX;
  pointerY = event.touches[0].clientY;
  document.getElementById('pointerPointsSpan').textContent = `${pointerX} ${pointerY}`;

  if (lastTouch) {
    const movementX = event.touches[0].clientX - lastTouch.x;
    const movementY = event.touches[0].clientY - lastTouch.y;

    // Find the center tile longitude and latitude indices (the integral part) and the ratio of the longitude and latitude within them (the fractional part)
    const centerTileLongitudeNumber = (longitude + 180) / 360 * Math.pow(2, zoom);
    const centerTileLatitudeNumber = (1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

    const centerDifferenceX = pointerX - canvasWidth / 2;
    const centerDifferenceY = pointerY - canvasHeight / 2;

    // Transfer the difference in canvas pixels to a difference in tile numbers (multiples of tile size)
    let pointerTileLongitudeNumber = centerTileLongitudeNumber + centerDifferenceX / tileWidth;
    let pointerTileLatitudeNumber = centerTileLatitudeNumber + centerDifferenceY / tileHeight;

    // Calculate the new longitude using the reserve formula plugging in the adjusted tile longitude number
    pointerLongitude = pointerTileLongitudeNumber / Math.pow(2, zoom) * 360 - 180;

    // Calculate the new latitude using the reserve formula plugging in the adjusted tile latitude number
    const pointerN = Math.PI - 2 * Math.PI * pointerTileLatitudeNumber / Math.pow(2, zoom);
    pointerLatitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(pointerN) - Math.exp(-pointerN)));

    document.getElementById('pointerCoordsSpan').textContent = `${pointerLongitude.toFixed(4)} ${pointerLatitude.toFixed(4)}`;

    // Transfer the change in canvas pixels to a change in tile numbers (multiples of tile size)
    let newCenterTileLongitudeNumber = centerTileLongitudeNumber + -movementX / tileWidth;
    let newCenterTileLatitudeNumber = centerTileLatitudeNumber + -movementY / tileHeight;

    // Calculate the new longitude using the reserve formula plugging in the adjusted tile longitude number
    mapCoords.longitude = newCenterTileLongitudeNumber / Math.pow(2, zoom) * 360 - 180;

    // Calculate the new latitude using the reserve formula plugging in the adjusted tile latitude number
    const n = Math.PI - 2 * Math.PI * newCenterTileLatitudeNumber / Math.pow(2, zoom);
    mapCoords.latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
    render();
  }

  lastTouch = { id: event.touches[0].identifier, x: event.touches[0].clientX, y: event.touches[0].clientY };

  // Try to make iOS Safari not over-scroll the page upon
  event.preventDefault();
  event.stopPropagation();
  return false;
});

mapCanvas.addEventListener('touchend', () => lastTouch = undefined);

mapCanvas.addEventListener('contextmenu', event => {
  event.preventDefault();
});

window.addEventListener('resize', render);

document.body.addEventListener('keydown', event => {
  switch (event.key) {
    case '+': {
      if (zoom >= 18) {
        break;
      }

      zoom++;
      document.getElementById('zoomSpan').textContent = zoom;
      render();
      break;
    }
    case '-': {
      if (zoom <= 0) {
        break;
      }

      zoom--;
      document.getElementById('zoomSpan').textContent = zoom;
      render();
      break;
    }
    case 'ArrowLeft': {
      if (longitude <= .0025) {
        break;
      }

      longitude -= .0025;
      document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
      render();
      break;
    }
    case 'ArrowRight': {
      if (longitude >= 180 - .0025) {
        break;
      }

      longitude += .0025;
      document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
      render();
      break;
    }
    case 'ArrowUp': {
      if (latitude >= 90 - .0025) {
        break;
      }

      latitude += .0025;
      document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
      render();
      break;
    }
    case 'ArrowDown': {
      if (latitude <= .0025) {
        break;
      }

      latitude -= .0025;
      document.getElementById('centerCoordsSpan').textContent = `${longitude.toFixed(4)} ${latitude.toFixed(4)}`;
      render();
      break;
    }
  }
});

let context;
let canvasWidth;
let canvasHeight;

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function render() {
  if (!mapCoords) {
    return;
  }

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
  const centerTileLongitudeNumber = (mapCoords.longitude + 180) / 360 * Math.pow(2, zoom);
  const centerTileLatitudeNumber = (1 - Math.log(Math.tan(mapCoords.latitude * Math.PI / 180) + 1 / Math.cos(mapCoords.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

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
  const renderLongitude = mapCoords.longitude;
  const renderLatitude = mapCoords.latitude;
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
          if (renderLongitude !== mapCoords.longitude || renderLatitude !== mapCoords.latitude || renderZoom !== zoom) {
            return;
          }

          // Draw the tile image
          context.drawImage(tile, tileCanvasX, tileCanvasY, tileWidth, tileHeight);

          const livePoi = liveCoords ? {
            type: 'pin', longitude: liveCoords.longitude, latitude: liveCoords.latitude
          } : undefined;

          // Find POIs on this tile
          for (const poi of (livePoi ? [...pois, livePoi] : pois)) {
            const longitudeNumber = (poi.longitude + 180) / 360 * Math.pow(2, zoom);
            const longitudeIndex = Math.floor(longitudeNumber);
            const longitudeRatio = longitudeNumber % 1;
            const latitudeNumber = (1 - Math.log(Math.tan(poi.latitude * Math.PI / 180) + 1 / Math.cos(poi.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
            const latitudeIndex = Math.floor(latitudeNumber);
            const latitudeRatio = latitudeNumber % 1;

            // Draw the POI if it belongs to this tile
            // TODO: Address the ticket which deals with POIs clipping if they are closer to the edge of the tile than their radius
            if (tileLongitudeIndex === longitudeIndex && tileLatitudeIndex === latitudeIndex) {
              switch (poi.type) {
                case 'locator': {
                  context.fillStyle = 'rgba(0, 0, 255, .2)';
                  context.beginPath();
                  const accuracyRadius = (100 / accuracy /* % */) * zoom / 2;
                  context.arc(tileCanvasX + longitudeRatio * tileWidth, tileCanvasY + latitudeRatio * tileHeight, accuracyRadius, 0, Math.PI * 2);
                  context.fill();
                  break;
                }
                case 'pin': {
                  context.fillStyle = 'rgba(0, 0, 0, .5)';
                  context.beginPath();
                  context.arc(tileCanvasX + longitudeRatio * tileWidth, tileCanvasY + latitudeRatio * tileHeight, 5, 0, Math.PI * 2);
                  context.fill();
                  break;
                }
              }
            }
          }

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
  document.getElementById('tilesSpan').textContent = `${centerTileLongitudeIndex} ${centerTileLatitudeIndex} | ${leftColumnTilesLongitudeIndex}+${horizontalTileCount} ${topRowTilesLatitudeIndex}+${verticalTileCount}`;
  document.getElementById('centerCoordsSpan').textContent = `${mapCoords.longitude.toFixed(4)} ${mapCoords.latitude.toFixed(4)}`;
  document.getElementById('zoomSpan').textContent = zoom;
}

// Render the initial map view
render();

function getTile(x, y, z) {
  const key = `osm-${z}-${x}-${y}`;
  const promise = new Promise((resolve, reject) => {
    const tileImage = new Image();

    // See if we already have this tile in memory
    const match = tileCache[key];
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
    const balance = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
    tileImage.src = `https://${balance}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

    // Ensure CORS is disabled so that `context.drawImage` is not insecure
    tileImage.crossOrigin = 'anonymous';

    tileImage.addEventListener('load', () => {
      resolve(tileImage);
      tileCache[key] = tileImage;
    });

    tileImage.addEventListener('error', reject);
  });

  // Store the loading promise so that we know not to load it again while it loads and wait instead
  tileCache[key] = promise;
  return promise;
}
