import { Component } from 'react';
import { withRouter } from 'react-router-dom';

// From https://gist.github.com/bummzack/a586533607ece482475e0c211790dd50
class NavigationPrompt extends Component {
  constructor(props) {
    super(props);
    this.state = { nextLocation: null, openModal: false };
    this.onCancel = this.onCancel.bind(this);
    this.onConfirm = this.onConfirm.bind(this);
  }

  componentDidMount() {
    this.unblock = this.props.history.block((nextLocation) => {
      if (this.props.when) {
        this.setState({
          openModal: true,
          nextLocation: nextLocation,
        });
      }
      return !this.props.when;
    });
  }

  componentWillUnmount() {
    this.unblock();
  }

  onCancel() {
    this.setState({ nextLocation: null, openModal: false });
  }

  onConfirm() {
    this.navigateToNextLocation();
  }

  navigateToNextLocation() {
    this.unblock();
    this.props.history.push(this.state.nextLocation.pathname);
  }

  render() {
    return (
      <div>
        {this.props.children(
          this.state.openModal,
          this.onConfirm,
          this.onCancel
        )}
      </div>
    );
  }
}

export default withRouter(NavigationPrompt);
