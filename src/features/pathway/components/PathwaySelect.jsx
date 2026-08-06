import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { BinAnimationIcon, DuplicateIcon } from 'assets/icons';
import './PathwaySelectOptions.css';

const activateOnKey = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    handler();
  }
};

const PathwayOptionWithCheckbox = ({
  pathwayName,
  checked,
  onToggle,
  onDelete,
  onDuplicate,
}) => {
  return (
    <div
      className="cea-pathway-option-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Toggle ${pathwayName} visibility`}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(pathwayName);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        />
        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={pathwayName}
        >
          {pathwayName}
        </div>
      </div>
      <div
        className="cea-pathway-option-actions"
        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <DuplicateIcon
          role="button"
          tabIndex={0}
          aria-label={`Duplicate ${pathwayName}`}
          style={{ padding: '2px 4px', cursor: 'pointer', opacity: 0.55 }}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.(pathwayName);
          }}
          onKeyDown={activateOnKey(() => onDuplicate?.(pathwayName))}
        />
        <BinAnimationIcon
          role="button"
          tabIndex={0}
          aria-label={`Delete ${pathwayName}`}
          style={{ padding: '2px 4px' }}
          className="cea-job-info-icon danger shake"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(pathwayName);
          }}
          onKeyDown={activateOnKey(() => onDelete?.(pathwayName))}
        />
      </div>
    </div>
  );
};

const PathwaySelect = ({
  selectedPathway,
  visiblePathways,
  overviewPathways,
  onToggleVisible,
  onDeletePathway,
  onDuplicatePathway,
  onCreatePathway,
  loading,
  allBaked,
}) => {
  const [open, setOpen] = useState(false);

  const sortedPathways = useMemo(() => {
    return [...overviewPathways]
      .map((p) => p.pathway_name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [overviewPathways]);

  const visibleSet = useMemo(() => new Set(visiblePathways), [visiblePathways]);

  const options = useMemo(() => {
    return sortedPathways.map((pathwayName) => ({
      label: (
        <PathwayOptionWithCheckbox
          pathwayName={pathwayName}
          checked={visibleSet.has(pathwayName)}
          onToggle={onToggleVisible}
          onDelete={onDeletePathway}
          onDuplicate={onDuplicatePathway}
        />
      ),
      value: pathwayName,
    }));
  }, [
    sortedPathways,
    visibleSet,
    onToggleVisible,
    onDeletePathway,
    onDuplicatePathway,
  ]);

  const hasPathways = overviewPathways.length > 0;

  const displayLabel =
    visiblePathways.length > 0
      ? visiblePathways.join('; ')
      : (selectedPathway ?? '');

  return (
    <Select
      className={`${visiblePathways.length === 1 && allBaked ? 'cea-scenario-select-blue' : 'cea-scenario-select'} ${!hasPathways || !selectedPathway || visiblePathways.length === 0 ? 'cea-select-empty cea-select-glow' : ''}`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder={hasPathways ? 'Select Pathway' : 'Create Pathway'}
      options={hasPathways ? options : []}
      value={visiblePathways.length > 0 ? selectedPathway : undefined}
      onChange={() => {}}
      onSelect={(pathwayName) => {
        onToggleVisible(pathwayName);
        setOpen(true);
      }}
      loading={loading}
      open={hasPathways ? open : false}
      onOpenChange={hasPathways ? setOpen : undefined}
      onClick={!hasPathways ? onCreatePathway : undefined}
      notFoundContent={<small>No pathways</small>}
      labelRender={() =>
        visiblePathways.length > 0 ? (
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayLabel}
          </span>
        ) : null
      }
    />
  );
};

export default PathwaySelect;
