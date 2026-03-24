import { Button, Divider } from 'antd';
import { useToolList } from 'features/tools/hooks';
import {
  TOOL_FALLBACK_ICON,
  TOOL_ICON_MAP,
  IGNORED_TOOL_SECTIONS,
} from 'features/tools/constants/toolIcons';
import './tool-choices.css';

export const ToolChoices = ({ onSelected }) => {
  const { data: tools, isLoading, isError } = useToolList();

  if (isLoading) return <div style={{ padding: 12 }}>Loading tools...</div>;
  if (isError) return <div style={{ padding: 12 }}>Error loading tools.</div>;

  return (
    <div className="cea-tool-choices">
      <h2>Select a Tool</h2>
      <div className="cea-tool-choices-group-list">
        {Object.keys(tools || {})
          .filter((category) => !IGNORED_TOOL_SECTIONS.includes(category))
          .map((category) => {
            const icon = TOOL_ICON_MAP[category] || TOOL_FALLBACK_ICON;
            return (
              <div key={category}>
                <Divider orientation="left" orientationMargin={0}>
                  <span className="cea-tool-choices-group-label">
                    {icon}
                    <small>{category}</small>
                  </span>
                </Divider>
                <div className="cea-tool-choices-group-content">
                  <div className="cea-tool-choices-button-list">
                    {tools[category].map((tool) => (
                      <Button
                        key={tool.name}
                        onClick={() => onSelected(tool.name)}
                        className="cea-tool-choices-button"
                      >
                        {tool.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
