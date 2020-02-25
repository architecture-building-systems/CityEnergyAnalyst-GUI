import React, { useContext } from 'react';
import { Button, Row, Col, Affix } from 'antd';
import { Plot, EmptyPlot } from './Plot';
import { ModalContext } from '../../utils/ModalManager';

export const RowLayout = ({ dashIndex, plots, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);

  const showModalAddPlot = () => {
    setModalVisible(modals.addPlot, true);
    activePlotRef.current = plots.length;
  };

  return (
    <React.Fragment>
      {plots.length ? (
        plots.map((data, index) => (
          <Row key={`${dashIndex}-${index}-${data.hash}`}>
            <Col>
              <Plot
                index={index}
                dashIndex={dashIndex}
                data={data}
                activePlotRef={activePlotRef}
              />
            </Col>
          </Row>
        ))
      ) : (
        <Row>
          <Col>
            <EmptyPlot
              dashIndex={dashIndex}
              index={0}
              activePlotRef={activePlotRef}
            />
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

export const GridLayout = ({ dashIndex, plots, grid_width, activePlotRef }) => {
  if (!plots.length) return <h1>No plots found</h1>;

  return (
    <div className="cea-dashboard-grid-container">
      {plots.map((data, index) => (
        <div
          key={`${dashIndex}-${index}-${data.hash}`}
          className={`cea-dashboard-grid-item span-${grid_width[index]}`}
        >
          {data.plot !== 'empty' ? (
            <Plot
              index={index}
              dashIndex={dashIndex}
              data={data}
              activePlotRef={activePlotRef}
            />
          ) : (
            <EmptyPlot
              dashIndex={dashIndex}
              index={index}
              activePlotRef={activePlotRef}
            />
          )}
        </div>
      ))}
    </div>
  );
};
