import { useEffect, useMemo, useRef } from 'react';
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

  // The very first fit for this map instance jumps straight from the
  // zoom-0/null-island default view state, so animating it reads as
  // an unwanted "zoom in" right after the app loads. Only the first
  // fit is instant; later fits (scenario switches, explicit
  // "Reset Camera" clicks) keep the FlyTo animation.
  const isFirstFitRef = useRef(true);

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

      setCameraOptions(cameraOptions);

      const isFirstFit = isFirstFitRef.current;
      isFirstFitRef.current = false;

      // Use functional update to avoid viewState dependency
      setViewState((prevViewState) => ({
        ...prevViewState,
        zoom: cameraOptions.zoom,
        bearing: cameraOptions.bearing,
        latitude: cameraOptions.center.lat,
        longitude: cameraOptions.center.lng,
        ...(isFirstFit
          ? { transitionDuration: 0 }
          : {
              transitionInterpolator: new FlyToInterpolator({ speed }),
              transitionDuration: duration,
            }),
      }));
    };

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
