window.addEventListener('load', async () => {
  // This doesn't seem to be increasing the storage quota which only seems to be able to hold a few tiles
  //console.log(await navigator.storage.persist());

  let gpsX = 0;
  let gpsY = 0;

  // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
  // TODO: Make it so these are center coordinates not top-left coordinates, then zoom will work as expected
  const { coords: { latitude, longitude } } = await getGps();
  let z = 12;
  let x = Math.floor((longitude + 180) / 360 * Math.pow(2, z));
  let y = Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

  document.getElementById('zoomInButton').addEventListener('click', () => {
    z++;
    x = Math.round(x * 2);
    y = Math.round(y * 2);
    render();
  });

  document.getElementById('zoomOutButton').addEventListener('click', () => {
    z--;
    x = Math.round(x / 2);
    y = Math.round(y / 2);
    render();
  });

  let mode = 'browse';
  document.getElementById('modeButton').addEventListener('click', () => {
    mode = mode === 'browse' ? 'draw' : 'browse';
  });

  const mapCanvas = document.getElementById('mapCanvas');

  let anchorTime;
  let strokes = [];
  mapCanvas.addEventListener('pointerdown', event => {
    if (mode === 'draw') {
      strokes.push([gpsX, gpsY, event.offsetX, event.offsetY]);
      return;
    }

    // TODO: Recognize a double left/right click and zoom in/out accordingly
    if (anchorTime && event.timeStamp - anchorTime < 250) {
      z++;
      x = Math.round(x * 2);
      y = Math.round(y * 2);
      render();
      return;
    }

    anchorTime = event.timeStamp;
  });

  mapCanvas.addEventListener('pointermove', event => {
    if (event.buttons === 1) {
      if (mode === 'draw') {
        strokes[strokes.length - 1].push(event.offsetX, event.offsetY);
        render();
        return;
      }

      gpsX += event.movementX;
      gpsY += event.movementY;

      render();
    }
  });

  window.addEventListener('resize', render);

  let context;
  let contextW;
  let contextH;
  function render() {

    // Cache the context for these dimensions
    if (contextW !== mapCanvas.clientWidth || contextH !== mapCanvas.clientHeight) {
      context = mapCanvas.getContext('2d');
      context.font = 'bold 9pt sans-serif';

      mapCanvas.width = mapCanvas.clientWidth;
      mapCanvas.height = mapCanvas.clientHeight;

      contextW = mapCanvas.width;
      contextH = mapCanvas.height;
    }

    // Remember what coordinates this render is for so that we can bail if the map moves meanwhile
    const forX = gpsX;
    const forY = gpsY;

    // Calculate the coordinates off-screen beyond the top-left corner so that the first row and column are covered in partial tiles
    const startX = gpsX === 0 ? 0 : (gpsX > 0 ? -(256 - (gpsX % 256)) : (gpsX % 256));
    const startY = gpsY === 0 ? 0 : (gpsY > 0 ? -(256 - (gpsY % 256)) : (gpsY % 256));

    // Find out how many visible tiles there are before the pivot tile (with negative signs)
    const diffX = -Math.ceil(gpsX / 256);
    const diffY = -Math.ceil(gpsY / 256);

    // Calculate the amount of tiles that fit on the screen adding an extra tile for the last row and column if the pivot one is beyond the top-left corner
    const tilesX = Math.ceil(mapCanvas.width / 256) + 1 /* Extra tile if case the leftmost one is shifted past the boundary */;
    const tilesY = Math.ceil(mapCanvas.height / 256) + 1 /* Extra tile if case the topmost one is shifted past the boundary */;

    // Keep track of what tile is at the center of the map for future code which will track the map view by the center tile not the top-left one
    const centerTileX = x + diffX + Math.floor(tilesX / 2);
    const centerTileY = y + diffY + Math.floor(tilesY / 2);

    for (let tileX = 0; tileX < tilesX; tileX++) {
      for (let tileY = 0; tileY < tilesY; tileY++) {
        // Calculate the final coordinates of the tile
        const gridX = startX + 256 * tileX;
        const gridY = startY + 256 * tileY;

        // Draw a red rectangle while the tile is loading to visualize the loading process
        context.fillStyle = 'red';
        context.fillRect(gridX, gridY, 256, 256);

        const coordX = x + diffX + tileX;
        const coordY = y + diffY + tileY;

        // Fire and forget the tile fetch logic and draw it when it returns assuming the map hasn't moved since
        getTile(coordX, coordY, z)
          .then(tile => {
            // Bail in case the map has moved since
            // TODO: If the map has translated but not scaled, we could calculate the new difference and just render moved, maybe check if not offscreen first?
            if (gpsX !== forX || gpsY !== forY) {
              return;
            }

            context.drawImage(tile, gridX, gridY);
            context.fillText(`${coordX} ${coordY}`, gridX, gridY + 10);

            // Draw a red rectangle around the anchor tile
            if (coordX === x && coordY === y) {
              context.strokeStyle = 'red';
              context.fillRect(gridX + 2, gridY + 2, 252, 252);
            }

            // Draw a lime rectangle around the center tile (to be merged with the anchor tile in a future update)
            if (coordX === centerTileX && coordY === centerTileY) {
              context.strokeStyle = 'lime';
              context.rect(gridX, gridY, 256, 256);
            }

            // Redraw all strokes after each tile so that tiles don't replace strokes
            // This will have the effect of ruining the antialiasing (drawing over and over if tile hasn't changed), maybe I need two buffers - one for tiles and one for strokes?
            context.lineWidth = 1;
            context.strokeStyle = 'lime';
            for (const stroke of strokes) {
              context.beginPath();
              const offsetX = gpsX - stroke[0];
              const offsetY = gpsY - stroke[1];
              for (let index = 2; index < stroke.length;) {
                context.lineTo(stroke[index++] + offsetX, stroke[index++] + offsetY);
              }

              context.stroke();
            }
          })
          .catch(error => {
            // TODO: Draw an error tile
            console.log(error);
          })
          ;
      }
    }

    document.getElementById('tileCooordSpan').textContent = `${x} ${y} ${z} | ${x + diffX}-${x + diffX + tilesX} ${y + diffY}-${y + diffY + tilesY} | ${centerTileX} ${centerTileY}`;
    document.getElementById('modeButton').textContent = mode === 'browse' ? 'Browsing mode. Switch to drawing' : 'Drawing mode. Switch to browsing';
  }

  render();
});

function getGps() {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }));
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
          console.log('Restored', key);
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
        console.log('Persisted', key);
      } catch (error) {
        console.log('Memorized', key);
        // Ignore quota error, the user either gave or didn't give persistent storage permission
      }
    });

    tileImage.addEventListener('error', reject);
  });

  // Store the loading promise so that we know not to load it again while it loads and wait instead
  tileCache[key] = promise;
  return promise;
}
