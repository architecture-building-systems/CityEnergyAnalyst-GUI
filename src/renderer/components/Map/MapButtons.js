import { createElement } from 'react';
import { BaseControl } from 'react-map-gl';
import './MapButtons.css';

const toggle3DDefaultProps = Object.assign({}, BaseControl.defaultProps, {
  className: '',
  showButton: true
});

const toggleMapStyleDefaultProps = Object.assign({}, BaseControl.defaultProps, {
  className: '',
  showButton: true
});

const resetCameraDefaultProps = Object.assign({}, BaseControl.defaultProps, {
  className: '',
  showButton: true
});

export class Toggle3DControl extends BaseControl {
  static defaultProps = toggle3DDefaultProps;

  state = { is3D: false };

  _updateViewport(opts) {
    const { viewState, setViewState } = this.props;
    setViewState({ ...viewState, ...opts });
  }

  _onToggle3D = () => {
    let { is3D } = this.state;
    if (is3D) {
      this._updateViewport({ pitch: 0, bearing: 0, transitionDuration: 300 });
    } else {
      this._updateViewport({ pitch: 45, transitionDuration: 300 });
    }
    this.props.callback(!is3D);
    this.setState({ is3D: !is3D });
  };

  _renderButton(type, label, callback) {
    return createElement('button', {
      key: type,
      className: `mapboxgl-ctrl-icon mapboxgl-ctrl-${type}`,
      id: '3d-button',
      'data-extruded': type === '3d',
      type: 'button',
      title: label,
      onClick: callback
    });
  }

  _render() {
    const { className, showButton } = this.props;
    if (!showButton) return null;

    const { is3D } = this.state;
    const type = is3D ? '2d' : '3d';

    return createElement(
      'div',
      {
        className: `mapboxgl-ctrl mapboxgl-ctrl-group ${className}`,
        ref: this._containerRef
      },
      [this._renderButton(type, 'Toggle 3D', this._onToggle3D)]
    );
  }
}

export class ToggleMapStyleControl extends BaseControl {
  static defaultProps = toggleMapStyleDefaultProps;

  state = { style: 'LIGHT_MAP' };

  _onToggleMapStyle = () => {
    let style = this.state.style === 'LIGHT_MAP' ? 'DARK_MAP' : 'LIGHT_MAP';
    this.props.callback(style);
    this.setState({ style });
  };

  _renderButton(type, label, callback) {
    return createElement('button', {
      key: type,
      className: `mapboxgl-ctrl-icon mapboxgl-ctrl-${type}`,
      type: 'button',
      title: label,
      onClick: callback
    });
  }

  _render() {
    const { className, showButton } = this.props;
    if (!showButton) return null;

    return createElement(
      'div',
      {
        className: `mapboxgl-ctrl mapboxgl-ctrl-group ${className}`,
        ref: this._containerRef
      },
      [
        this._renderButton(
          'map-style',
          'Toggle Map Style',
          this._onToggleMapStyle
        )
      ]
    );
  }
}

export class ResetCameraControl extends BaseControl {
  static defaultProps = resetCameraDefaultProps;

  _updateViewport(opts) {
    const { viewState, setViewState } = this.props;
    setViewState({ ...viewState, ...opts });
  }

  _onResetCamera = () => {
    const { cameraOptions } = this.props;
    this._updateViewport({
      zoom: cameraOptions.zoom,
      latitude: cameraOptions.center.lat,
      longitude: cameraOptions.center.lng
    });
  };

  _renderButton(type, label, callback) {
    return createElement('button', {
      key: type,
      className: `mapboxgl-ctrl-icon mapboxgl-ctrl-${type}`,
      type: 'button',
      title: label,
      onClick: callback
    });
  }

  _render() {
    const { className, showButton } = this.props;
    if (!showButton) return null;

    return createElement(
      'div',
      {
        className: `mapboxgl-ctrl mapboxgl-ctrl-group ${className}`,
        ref: this._containerRef
      },
      [this._renderButton('reset-camera', 'Reset Camera', this._onResetCamera)]
    );
  }
}
