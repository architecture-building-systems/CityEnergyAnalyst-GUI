import { useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { FlyToInterpolator } from 'deck.gl';

export const useCameraFitBounds = (
  mapRef,
  data,
  setCameraOptions,
  resetCameraOptions,
  cameraOptionsCalculated,
  setViewState,
  options = {},
) => {
  const { speed = 2, duration = 1000, maxZoom = 16, padding = 8 } = options;
  const { zone, surroundings } = data ?? {};

  //Reset camera options when zone is removed
  useEffect(() => {
    if (!zone) {
      resetCameraOptions();
    }
  }, [zone, resetCameraOptions]);

  // Memoize bbox calculation to avoid recalculation on unrelated changes
  const bboxPoly = useMemo(() => {
    if (!zone) return null;

    let bbox = turf.bboxPolygon(turf.bbox(zone));

    if (surroundings?.features?.length) {
      bbox = turf.union(
        turf.featureCollection([
          bbox,
          turf.bboxPolygon(turf.bbox(surroundings)),
        ]),
      );
    }

    return bbox;
  }, [zone, surroundings]);

  // Calculate and apply camera options when data changes
  useEffect(() => {
    if (!bboxPoly || !mapRef.current || cameraOptionsCalculated) {
      return;
    }

    const calculateCameraOptions = () => {
      const mapbox = mapRef.current.getMap();

      const cameraOptions = mapbox.cameraForBounds(turf.bbox(bboxPoly), {
        maxZoom,
        padding,
      });

      console.log('Camera options calculated:', cameraOptions);
      setCameraOptions(cameraOptions);

      // Use functional update to avoid viewState dependency
      setViewState((prevViewState) => ({
        ...prevViewState,
        zoom: cameraOptions.zoom,
        bearing: cameraOptions.bearing,
        latitude: cameraOptions.center.lat,
        longitude: cameraOptions.center.lng,
        transitionInterpolator: new FlyToInterpolator({ speed }),
        transitionDuration: duration,
      }));
    };

    console.log('Calculating camera options');
    calculateCameraOptions();
  }, [
    bboxPoly,
    mapRef,
    cameraOptionsCalculated,
    setCameraOptions,
    setViewState,
    speed,
    duration,
    maxZoom,
    padding,
  ]);
};
