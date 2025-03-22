import { useRef } from 'react';

import { Input } from 'antd';

import { EXAMPLE_CITIES } from '../Project/CreateScenarioForms/constants';
import { useGeocodeLocation } from './hooks';

const LocationSearchBar = ({ onLocationResult }) => {
  const randomCity = useRef(
    EXAMPLE_CITIES[Math.floor(Math.random() * EXAMPLE_CITIES.length)],
  );

  const { locationAddress, searchAddress, loading } =
    useGeocodeLocation(onLocationResult);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      Search for a location
      <Input.Search
        placeholder={`Example: type "${randomCity.current}”`}
        allowClear
        loading={loading}
        onSearch={searchAddress}
      />
      {loading ? (
        <small>Searching...</small>
      ) : locationAddress instanceof Error ? (
        <small style={{ color: 'red', fontStyle: 'italic' }}>
          Location not found
        </small>
      ) : (
        locationAddress && (
          <small>
            <i>Found location: {locationAddress?.display_name || 'Unknown'}</i>
          </small>
        )
      )}
    </div>
  );
};

export default LocationSearchBar;
