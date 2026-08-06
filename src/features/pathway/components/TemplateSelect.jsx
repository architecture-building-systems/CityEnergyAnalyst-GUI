import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { BinAnimationIcon, InputEditorIcon } from 'assets/icons';
import './PathwaySelectOptions.css';

const activateOnKey = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    handler();
  }
};

const TemplateOption = ({ templateName, description, onEdit, onDelete }) => {
  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(templateName);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.(templateName);
  };

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
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
        }}
        title={description ? `${templateName}: ${description}` : templateName}
      >
        {templateName}
        {description ? (
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>: {description}</span>
        ) : null}
      </div>
      <div
        className="cea-pathway-option-actions"
        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <InputEditorIcon
          role="button"
          tabIndex={0}
          aria-label={`Edit '${templateName}'`}
          style={{ padding: '2px 6px' }}
          className="cea-job-info-icon"
          title={`Edit '${templateName}'`}
          onClick={handleEditClick}
          onKeyDown={activateOnKey(() => onEdit?.(templateName))}
        />
        <BinAnimationIcon
          role="button"
          tabIndex={0}
          aria-label={`Delete '${templateName}'`}
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          title={`Delete '${templateName}'`}
          onClick={handleDeleteClick}
          onKeyDown={activateOnKey(() => onDelete?.(templateName))}
        />
      </div>
    </div>
  );
};

const TemplateSelect = ({
  templates,
  descriptions,
  selectedTemplates,
  onSelectTemplates,
  onEditTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  loading,
}) => {
  const [open, setOpen] = useState(false);

  const sortedTemplates = useMemo(() => {
    return [...(templates ?? [])].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }, [templates]);

  const options = useMemo(() => {
    return sortedTemplates.map((name) => ({
      label: (
        <TemplateOption
          templateName={name}
          description={descriptions?.[name]}
          onEdit={onEditTemplate}
          onDelete={onDeleteTemplate}
        />
      ),
      value: name,
    }));
  }, [sortedTemplates, descriptions, onEditTemplate, onDeleteTemplate]);

  const hasTemplates = sortedTemplates.length > 0;

  return (
    <Select
      mode="multiple"
      optionLabelProp="value"
      className={`cea-template-select ${!hasTemplates ? 'cea-select-empty cea-select-glow' : ''}`}
      style={{ width: 416 }}
      styles={{ popup: { root: { width: 416 } } }}
      placeholder={
        hasTemplates ? 'Intervention Templates' : 'Create Intervention Template'
      }
      options={hasTemplates ? options : []}
      value={selectedTemplates}
      onChange={onSelectTemplates}
      maxTagCount="responsive"
      allowClear={hasTemplates}
      loading={loading}
      open={hasTemplates ? open : false}
      onOpenChange={hasTemplates ? setOpen : undefined}
      onClick={!hasTemplates ? onCreateTemplate : undefined}
      notFoundContent={<small>No intervention templates</small>}
    />
  );
};

export default TemplateSelect;
