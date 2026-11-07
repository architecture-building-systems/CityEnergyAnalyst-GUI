import { Dropdown, Tooltip } from 'antd';
import {
  DatabaseEditorIcon,
  InsightIcon,
  ReportsIcon,
  InputEditorIcon,
  TimelineIcon,
} from 'assets/icons';
import useNavigationStore from 'stores/navigationStore';

import routes from 'constants/routes.json';
import { CEA_GREY_LIGHT } from 'constants/theme';
import { useHoverGrow } from 'features/project/hooks/hover-grow';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useSelectTool } from 'features/project/stores/tool-card';
import { useReportBuilders } from 'features/report-builder/hooks/useReportBuilders';

import { animated } from '@react-spring/web';

const BottomToolButtons = ({
  showTools,
  onOpenInputEditor,
  inputEditorOpen,
  onTogglePathwayPanel,
  pathwayPanelOpen,
  hidePathwayBuilder,
  demoMode,
}) => {
  const { push } = useNavigationStore();
  // The canvas works on the scenario, not on an inspected pathway state.
  const inspectingState = useProjectStore((s) => s.childScenario?.year != null);
  const selectTool = useSelectTool();
  // Report tools come from CEA and its plugins; none in the public demo, which can't run jobs.
  const { data: reportBuilders = [], isLoading: reportBuildersLoading } =
    useReportBuilders({ enabled: !!showTools && !demoMode });

  const items = [
    {
      id: 'database-editor',
      icon: DatabaseEditorIcon,
      title: 'Database Editor',
      onClick: () => push(routes.DATABASE_EDITOR),
      hidden: !showTools,
    },
    {
      id: 'input-editor',
      icon: InputEditorIcon,
      title: 'Input Editor',
      onClick: () => onOpenInputEditor?.(),
      hidden: !showTools,
      active: inputEditorOpen,
    },
    {
      id: 'pathway',
      icon: TimelineIcon,
      title: 'Pathway Builder [BETA]',
      onClick: () => onTogglePathwayPanel?.(),
      // Pathways aren't part of the public demo API at all.
      hidden: !showTools || hidePathwayBuilder || demoMode,
      active: pathwayPanelOpen,
    },
    {
      id: 'canvas',
      icon: InsightIcon,
      title: 'Canvas Builder [BETA]',
      onClick: () => push(routes?.CANVAS),
      disabledReason: inspectingState
        ? 'Not available when inspecting State'
        : null,
      hidden: !showTools,
    },
    {
      id: 'reports',
      icon: ReportsIcon,
      title: 'Report Builder',
      // A single report tool opens straight away; several are picked from a menu.
      onClick:
        reportBuilders.length === 1
          ? () => selectTool(reportBuilders[0].name)
          : undefined,
      menuItems:
        reportBuilders.length > 1
          ? reportBuilders.map((builder) => ({
              key: builder.name,
              label: builder.label,
            }))
          : undefined,
      onMenuClick: ({ key }) => selectTool(key),
      disabledReason: reportBuilders.length
        ? null
        : reportBuildersLoading
          ? 'Loading...'
          : 'No report tools installed',
      hidden: !showTools || demoMode,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
      }}
    >
      {items.map((item) => (
        <ToolHoverButton
          key={item.id}
          icon={item.icon}
          title={item.title}
          onClick={item.onClick}
          menuItems={item.menuItems}
          onMenuClick={item.onMenuClick}
          disabledReason={item.disabledReason}
          hidden={item.hidden}
          active={item.active}
        />
      ))}
    </div>
  );
};

// `disabledReason` greys the button out, with the reason under the title in its tooltip.
const ToolHoverButton = ({
  title,
  icon,
  onClick,
  menuItems,
  onMenuClick,
  disabledReason,
  hidden,
  active,
}) => {
  // Half the default hover-enlarge (1.2 → 1.1) so the five bottom-
  // left buttons read as a tighter row — the default 20 % grow felt
  // too prominent at this scale. Other call sites of `useHoverGrow`
  // (ToolFormButtons, ShowHideCardsButton) keep the default.
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow(1, 1.1);
  const _icon = icon;

  if (hidden) return null;

  if (disabledReason)
    return (
      <Tooltip
        title={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div>{title}</div>
            <div>{disabledReason}</div>
          </div>
        }
        styles={{ body: { fontSize: 12 } }}
      >
        <button
          className="cea-overlay-card cea-card-toolbar-icon-container"
          aria-disabled="true"
          style={disabledButtonStyle}
        >
          <div className="cea-card-toolbar-icon no-hover-color">
            <_icon />
          </div>
        </button>
      </Tooltip>
    );

  const button = (
    <button
      className="cea-overlay-card cea-card-toolbar-icon-container"
      onClick={onClick}
      style={{
        backgroundColor: active ? 'rgb(38, 89, 160)' : undefined,
      }}
    >
      <div className="cea-card-toolbar-icon no-hover-color">
        <_icon />
      </div>
    </button>
  );

  return (
    <Tooltip title={title} styles={{ body: { fontSize: 12 } }}>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        {menuItems ? (
          <Dropdown
            menu={{ items: menuItems, onClick: onMenuClick }}
            trigger={['click']}
            placement="topLeft"
          >
            {button}
          </Dropdown>
        ) : (
          button
        )}
      </animated.div>
    </Tooltip>
  );
};

// Not the `disabled` attribute: a disabled button fires no mouse events in some browsers,
// so its tooltip would never show.
const disabledButtonStyle = {
  backgroundColor: CEA_GREY_LIGHT,
  cursor: 'not-allowed',
};

export default BottomToolButtons;
