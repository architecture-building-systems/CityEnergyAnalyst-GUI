import { useState, useEffect, useRef } from 'react';
import './DatabaseEditor.css';
import Handsontable from 'handsontable';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import { createRoot } from 'react-dom/client';

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
        .filter((obj) => typeof obj !== 'undefined'),
    );
  }, []);

  useEffect(() => {
    if (tableGlossary.length) {
      const root = createRoot(tooltipRef.current);
      root.render(tooltipPrompt);
      const tableInstance = tableRef.current.hotInstance;
      Handsontable.hooks.add(
        'afterOnCellMouseOver',
        (e, coords) => {
          if (coords.row == -1 && coords.col != -1) {
            if (typeof tableGlossary[coords.col] !== 'undefined') {
              const { VARIABLE, DESCRIPTION, UNIT } = tableGlossary[coords.col];
              root.render(
                <p className="cea-database-editor-column-tooltip">
                  <b>{VARIABLE}</b>
                  {' : '}
                  <i>{DESCRIPTION}</i>
                  {' / UNIT: '}
                  <span>{UNIT}</span>
                </p>,
              );
            }
          }
        },
        tableInstance,
      );
    }
  }, [tableGlossary]);

  return <div ref={tooltipRef}></div>;
};

export default withErrorBoundary(ColumnGlossary);
