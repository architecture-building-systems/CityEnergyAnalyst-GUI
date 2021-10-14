import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import './DatabaseEditor.css';
import Handsontable from 'handsontable';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

const ColumnGlossary = ({ tableRef, colHeaders, filter }) => {
  const tooltipRef = useRef();
  const dbGlossary = useSelector((state) => state.databaseEditor.glossary);
  const [tableGlossary, setTableGlossary] = useState([]);
  const tooltipPrompt = (
    <p className="cea-database-editor-column-tooltip">
      <i>Hover over column headers to see their description.</i>
    </p>
  );

  useEffect(() => {
    const _dbGlossary =
      typeof filter === 'function'
        ? dbGlossary.filter((variable) => filter(variable))
        : dbGlossary;
    setTableGlossary(
      colHeaders
        .map((col) => _dbGlossary.find((variable) => col === variable.VARIABLE))
        .filter((obj) => typeof obj !== 'undefined')
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
