import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { remote, ipcRenderer } from 'electron';
import { Button, Card, Menu, Tooltip, Icon, Spin, Empty, Dropdown } from 'antd';
import parser from 'html-react-parser';
import axios from 'axios';
import { ModalContext } from '../../utils/ModalManager';
import { usePlotDependencies } from './Dashboard';

const defaultPlotStyle = {
  height: 'calc(50vh - 160px)',
  minHeight: 300,
  margin: 5
};

export const PlotRoute = ({ match }) => {
  const { index, dashIndex } = match.params;
  const [data, setData] = useState(null);
  const dependenciesMounted = usePlotDependencies();
  const SimplePlot = ({ dashIndex, index, data }) => {
    const [div, error] = useFetchPlotDiv(dashIndex, index, data);
    return (
      <div
        style={{
          height: '100vh',
          padding: 20,
          display: 'grid',
          gridTemplate: 'auto minmax(0, 1fr) / minmax(0, 1fr)'
        }}
      >
        <div style={{ gridRow: '1/2' }}>
          <h3>
            {data.title} - {data.parameters['scenario-name']}
          </h3>
        </div>
        <div style={{ gridRow: '2/-1' }}>
          {div ? div.content : error ? <ErrorPlot error={error} /> : null}
        </div>
      </div>
    );
  };

  // Get plot data from ipc
  useEffect(() => {
    ipcRenderer.once(`plot-data-${dashIndex}-${index}`, function(
      event,
      plotData
    ) {
      setData(plotData);
    });
  }, []);

  return (
    <div>
      {dependenciesMounted && data ? (
        <SimplePlot dashIndex={dashIndex} index={index} data={data} />
      ) : (
        <LoadingPlot plotStyle={{ height: '100vh' }} />
      )}
    </div>
  );
};

const useFetchPlotDiv = (dashIndex, index, hash) => {
  const [div, setDiv] = useState(null);
  const [error, setError] = useState(null);

  // Get plot div
  useEffect(() => {
    let mounted = true;
    const source = axios.CancelToken.source();
    const fetch = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5050/plots/div/${dashIndex}/${index}`,
          {
            cancelToken: source.token
          }
        );
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
      } catch (err) {
        setError(err.response);
      }
    };

    fetch();

    return () => {
      // Cancel the request if it is not completed
      mounted = false;
      source.cancel();

      // Clean up script node if it is mounted
      let script = document.querySelector(
        `script[data-id=script-cea-react-${hash}]`
      );
      if (script) script.remove();
    };
  }, []);

  // Mount script node when div is mounted
  useEffect(() => {
    if (div) {
      var _script = document.createElement('script');
      _script.dataset.id = `script-cea-react-${hash}`;
      document.body.appendChild(_script);
      _script.append(div.script);
    }
  }, [div]);

  return [div, error];
};

export const Plot = ({
  index,
  dashIndex,
  data,
  style,
  activePlotRef = 0,
  windowed = false
}) => {
  const plotStyle = { ...defaultPlotStyle, ...style };
  const [div, error] = useFetchPlotDiv(dashIndex, index, data.hash);

  return (
    <Card
      title={
        <div>
          <span style={{ fontWeight: 'bold' }}>{data.title}</span>
          {data.parameters['scenario-name'] && (
            <React.Fragment>
              <span> - </span>
              <small>{data.parameters['scenario-name']}</small>
              {!windowed && (
                <OpenInWindow index={index} dashIndex={dashIndex} data={data} />
              )}
            </React.Fragment>
          )}
        </div>
      }
      extra={
        <React.Fragment>
          {div ? (
            div.content.length === 1 ? (
              <React.Fragment>
                <PlotLegendToggle divID={div.content[0].props.id} />
                {!windowed && (
                  <InputFiles index={index} activePlotRef={activePlotRef} />
                )}
              </React.Fragment>
            ) : null
          ) : null}
          {!windowed && (
            <EditMenu index={index} activePlotRef={activePlotRef} />
          )}
        </React.Fragment>
      }
      style={{ ...plotStyle, height: '', minHeight: '' }}
      bodyStyle={{
        height: plotStyle.height,
        minHeight: plotStyle.minHeight
      }}
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
        style={{ color: showLegend ? '#1890ff' : 'grey' }}
      />
    </Tooltip>
  );
};

const InputFiles = ({ index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);
  const showModalInputFiles = () => {
    setModalVisible(modals.inputFiles, true);
    activePlotRef.current = index;
  };

  return (
    <Tooltip title="Show input file location">
      <Icon type="container" theme="twoTone" onClick={showModalInputFiles} />
    </Tooltip>
  );
};

const OpenInWindow = ({ index, dashIndex, data }) => {
  const openNewWindow = () => {
    let win = new remote.BrowserWindow({
      width: 800,
      height: 600,
      title: `City Energy Analyst - ${data.title} - ${
        data.parameters['scenario-name']
      }`,
      titleBarStyle: 'hidden',
      webPreferences: { nodeIntegration: true }
    });
    // win.removeMenu();
    win.on('closed', () => {
      win = null;
    });

    win.webContents.on('did-finish-load', () => {
      win.webContents.send(`plot-data-${dashIndex}-${index}`, data);
    });

    if (process.env.NODE_ENV !== 'production') {
      win.loadURL(
        `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}/#/plot/${dashIndex}/${index}`
      );
    } else {
      win.loadURL(`file://${__dirname}/index.html#/plot/${dashIndex}/${index}`);
    }
  };

  return (
    <Tooltip title="Open in new window">
      <Icon
        component={() => (
          <svg viewBox="0 0 1091 1000" width="1em" height="1em">
            <path
              d="M1091 0v636H818v364H0V364h273V0h818zM818 545h182V182H364v182h454v181zM91 909h636V545H91v364z"
              fill="#1890ff"
            />
          </svg>
        )}
        style={{ margin: '0 10px' }}
        onClick={openNewWindow}
      />
    </Tooltip>
  );
};

const EditMenu = React.memo(({ index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);

  const showModalEditParameters = () => {
    setModalVisible(modals.editParameters, true);
    activePlotRef.current = index;
  };
  const showModalChangePlot = () => {
    setModalVisible(modals.changePlot, true);
    activePlotRef.current = index;
  };
  const showModalDeletePlot = () => {
    setModalVisible(modals.deletePlot, true);
    activePlotRef.current = index;
  };

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
        <Icon type="edit" theme="twoTone" />
      </Dropdown>
    </React.Fragment>
  );
});

const LoadingPlot = ({ plotStyle = defaultPlotStyle }) => {
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
  if (error.status === 404)
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {parser(error.data, {
          replace: function(domNode) {
            if (domNode.type === 'tag' && domNode.name === 'a') {
              return (
                <Link to={domNode.attribs.href}>
                  {domNode.children[0].data}
                </Link>
              );
            }
          }
        })}
      </div>
    );
  if (error.status === 500)
    return (
      <React.Fragment>
        <div style={{ textAlign: 'center', margin: 20 }}>
          <h3>Something went wrong!</h3>
        </div>
        <pre
          style={{
            height: '70%',
            fontSize: 10,
            overflow: 'auto'
          }}
        >
          {error.data}
        </pre>
      </React.Fragment>
    );
  return null;
};

export const EmptyPlot = ({ style, index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);

  const showModalAddPlot = () => {
    setModalVisible(modals.addPlot, true);
    activePlotRef.current = index;
  };

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
