import React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Row, Col, Affix } from 'antd';
import { setModalAddPlotVisibility } from '../../actions/dashboard';
import { Plot, EmptyPlot, LoadingPlot } from './Plot';

export const RowLayout = ({ dashIndex, plots }) => {
  const dispatch = useDispatch();

  const showModalAddPlot = () =>
    dispatch(setModalAddPlotVisibility(true, dashIndex, plots.length));

  return (
    <React.Fragment>
      {plots.length ? (
        plots.map((data, index) => (
          <Row key={`${dashIndex}-${index}-${data.hash}`}>
            <Col>
              <Plot index={index} dashIndex={dashIndex} data={data} />
            </Col>
          </Row>
        ))
      ) : (
        <Row>
          <Col>
            <EmptyPlot dashIndex={dashIndex} index={0} />
          </Col>
        </Row>
      )}

      {plots.length ? (
        <Affix offsetBottom={100}>
          <Button
            type="primary"
            icon="plus"
            style={{ float: 'right', marginTop: 20 }}
            onClick={showModalAddPlot}
          >
            Add plot
          </Button>
        </Affix>
      ) : null}
    </React.Fragment>
  );
};

export const GridLayout = ({ dashIndex, plots, grid_width }) => {
  if (!plots.length) return <h1>No plots found</h1>;

  return (
    <React.Fragment>
      <div className="row display-flex">
        {plots.map((data, index) => (
          <div
            className={`col-lg-${grid_width[index] *
              4} col-md-12 col-sm-12 col-xs-12 plot-widget`}
            key={`${dashIndex}-${index}-${data.hash}`}
          >
            {data.plot !== 'empty' ? (
              <Plot index={index} dashIndex={dashIndex} data={data} />
            ) : (
              <EmptyPlot dashIndex={dashIndex} index={index} />
            )}
          </div>
        ))}
      </div>
    </React.Fragment>
  );
};
