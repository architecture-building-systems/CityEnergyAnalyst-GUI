import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './DatabaseEditor.css';
import Handsontable from 'handsontable';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

const ColumnGlossary = ({ tableRef, colHeaders, glossary }) => {
  const tooltipRef = useRef();
  const [tableGlossary, setTableGlossary] = useState([]);
  const tooltipPrompt = (
    <p className="cea-database-editor-column-tooltip">
      <i>Hover over column headers to see their description.</i>
    </p>
  );

  useEffect(() => {
    setTableGlossary(
      colHeaders
        .map(col => glossary.find(variable => col === variable.VARIABLE))
        .filter(obj => typeof obj !== 'undefined')
    );
  }, []);

  useEffect(() => {
    if (tableGlossary.length) {
      ReactDOM.render(tooltipPrompt, tooltipRef.current);
      const tableInstance = tableRef.current.hotInstance;
      Handsontable.hooks.add(
        'afterOnCellMouseOver',
        (e, coords, td) => {
          if (coords.row == -1 && coords.col != -1) {
            if (typeof tableGlossary[coords.col] !== 'undefined') {
              const { VARIABLE, DESCRIPTION, UNIT } = tableGlossary[coords.col];
              ReactDOM.render(
                <p className="cea-database-editor-column-tooltip">
                  <b>{VARIABLE}</b>
                  {' : '}
                  <i>{DESCRIPTION}</i>
                  {' / UNIT: '}
                  <span>{UNIT}</span>
                </p>,
                tooltipRef.current
              );
            }
          }
        },
        tableInstance
      );
    }
  }, [tableGlossary]);

  return <div ref={tooltipRef}></div>;
};

export default withErrorBoundary(ColumnGlossary);
