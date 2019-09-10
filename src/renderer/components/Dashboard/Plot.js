import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Button, Card, Menu, Tooltip, Icon, Spin, Empty, Dropdown } from 'antd';
import parser from 'html-react-parser';
import axios from 'axios';
import {
  setModalEditParametersVisibility,
  setModalDeletePlotVisibility,
  setModalChangePlotVisibility,
  setModalAddPlotVisibility
} from '../../actions/dashboard';

const defaultPlotStyle = {
  height: 'calc(50vh - 125px)',
  minHeight: 300,
  margin: 5
};

export const Plot = ({ index, dashIndex, data, style }) => {
  const [div, setDiv] = useState(null);
  const [error, setError] = useState(null);

  const plotStyle = { ...defaultPlotStyle, ...style };

  // TODO: Maybe find a better solution
  const hash = `cea-react-${data.hash}`;

  // Get plot div
  useEffect(() => {
    let mounted = true;
    const source = axios.CancelToken.source();
    axios
      .get(`http://localhost:5050/plots/div/${dashIndex}/${index}`, {
        cancelToken: source.token
      })
      .then(response => {
        if (mounted)
          setDiv(() => {
            let script = null;
            let content = parser(response.data, {
              replace: function(domNode) {
                if (domNode.type === 'script' && domNode.children[0]) {
                  script = domNode.children[0].data;
                }
              }
            }).filter(node => node.type === 'div' || node.type === 'style');
            return { content, script };
          });
      })
      .catch(_error => {
        setError(_error.response);
      });

    return () => {
      // Cancel the request if it is not completed
      mounted = false;
      source.cancel();

      // Clean up script node if it is mounted
      let script = document.querySelector(`script[data-id=script-${hash}]`);
      if (script) script.remove();
    };
  }, []);

  // Mount script node when div is mounted
  useEffect(() => {
    if (div) {
      var _script = document.createElement('script');
      _script.dataset.id = `script-${hash}`;
      document.body.appendChild(_script);
      _script.append(div.script);
    }
  }, [div]);

  return (
    <Card
      title={
        <div>
          <span style={{ fontWeight: 'bold' }}>{data.title}</span>
          {data.parameters['scenario-name'] && (
            <React.Fragment>
              <span> - </span>
              <small>{data.parameters['scenario-name']}</small>
            </React.Fragment>
          )}
        </div>
      }
      extra={
        <React.Fragment>
          {div ? (
            div.content.length === 1 ? (
              <PlotLegendToggle divID={div.content[0].props.id} />
            ) : null
          ) : null}
          <EditMenu dashIndex={dashIndex} index={index} />
        </React.Fragment>
      }
      style={{ ...plotStyle, height: '', minHeight: '' }}
      bodyStyle={{ height: plotStyle.height, minHeight: plotStyle.minHeight }}
      size="small"
    >
      {div ? (
        div.content
      ) : error ? (
        <ErrorPlot error={error} />
      ) : (
        <LoadingPlot plotStyle={plotStyle} />
      )}
    </Card>
  );
};

const PlotLegendToggle = ({ divID }) => {
  const [showLegend, setShowLegend] = useState(true);
  const toggleLegends = () => {
    window.Plotly.relayout(divID, { showlegend: !showLegend });
    setShowLegend(!showLegend);
  };

  return (
    <Tooltip title="Toggle Legend">
      <Icon
        type="unordered-list"
        onClick={toggleLegends}
        style={{ color: showLegend ? '#1890ff' : 'grey', margin: '0 5px' }}
      />
    </Tooltip>
  );
};

const EditMenu = React.memo(({ dashIndex, index }) => {
  const dispatch = useDispatch();

  const showModalEditParameters = () =>
    dispatch(setModalEditParametersVisibility(true, dashIndex, index));

  const showModalChangePlot = () =>
    dispatch(setModalChangePlotVisibility(true, dashIndex, index));

  const showModalDeletePlot = () =>
    dispatch(setModalDeletePlotVisibility(true, dashIndex, index));

  const menu = (
    <Menu>
      <Menu.Item key="changePlot" onClick={showModalChangePlot}>
        Change Plot
      </Menu.Item>
      <Menu.Item key="editParameters" onClick={showModalEditParameters}>
        Edit Parameters
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="deletePlot" onClick={showModalDeletePlot}>
        <div style={{ color: 'red' }}>Delete Plot</div>
      </Menu.Item>
    </Menu>
  );

  return (
    <React.Fragment>
      <Dropdown overlay={menu} trigger={['click']}>
        <Icon type="edit" theme="twoTone" style={{ margin: '0 5px' }} />
      </Dropdown>
    </React.Fragment>
  );
});

const LoadingPlot = ({ plotStyle }) => {
  return (
    <Spin
      indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
      tip="Loading Plot..."
    >
      <div style={{ height: plotStyle.height }} />
    </Spin>
  );
};

const ErrorPlot = ({ error }) => {
  console.log(error.status);
  if (error.status === 404) return parser(error.data);
  if (error.status === 500)
    return (
      <React.Fragment>
        <div style={{ textAlign: 'center' }}>
          <h3>Something went wrong!</h3>
        </div>
        <pre style={{ height: 200, fontSize: 10, overflow: 'auto' }}>
          {error.data}
        </pre>
      </React.Fragment>
    );
  return null;
};

export const EmptyPlot = ({ style, dashIndex, index }) => {
  const dispatch = useDispatch();
  const showModalAddPlot = () =>
    dispatch(setModalAddPlotVisibility(true, dashIndex, index));

  const plotStyle = { ...defaultPlotStyle, ...style };

  return (
    <Card
      title="Empty Plot"
      style={{ ...plotStyle, height: '', minHeight: '' }}
      bodyStyle={{ height: plotStyle.height, minHeight: plotStyle.minHeight }}
      size="small"
    >
      <Empty>
        <Button type="primary" icon="plus" onClick={showModalAddPlot}>
          Add plot
        </Button>
      </Empty>
    </Card>
  );
};
