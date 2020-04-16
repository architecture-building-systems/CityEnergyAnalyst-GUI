// @flow
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Menu, Icon, Tooltip } from 'antd';
import { fetchToolList } from '../../actions/tools';
import routes from '../../constants/routes';

const { SubMenu } = Menu;

const ToolsMenu = (props) => {
  const { status, tools } = useSelector((state) => state.toolList);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchToolList());
  }, []);

  let toolMenu = null;
  if (status == 'fetching') {
    toolMenu = <Menu.Item key="no-tools">Fetching Tools...</Menu.Item>;
  } else if (status == 'failed') {
    toolMenu = <Menu.Item key="no-tools">Error Fetching Tools</Menu.Item>;
  } else if (Object.keys(tools).length) {
    const toolCategoryList = Object.keys(tools).map((category) => {
      const toolList = tools[category].map((tool) => {
        const { name, label, description } = tool;
        return (
          <ToolItem
            key={name}
            name={name}
            label={label}
            description={description}
          />
        );
      });
      return (
        <SubMenu
          key={category}
          title={<span>{category}</span>}
          style={{ minWidth: '200px' }}
          {...props}
        >
          {toolList}
        </SubMenu>
      );
    });

    toolMenu = toolCategoryList;
  } else {
    toolMenu = <Menu.Item key="no-tools">No Tools Found</Menu.Item>;
  }

  return (
    <SubMenu
      key="tools"
      title={
        <span>
          <Icon type="tool" />
          <span>Tools</span>
        </span>
      }
      {...props}
    >
      {toolMenu}
    </SubMenu>
  );
};

const ToolItem = (props) => {
  const { name, label, description, ...rest } = props;
  return (
    <Link to={`${routes.TOOLS}/${name}`}>
      <Menu.Item {...rest}>
        <Tooltip title={description} placement="right">
          <div>
            <span>{label}</span>
          </div>
        </Tooltip>
      </Menu.Item>
    </Link>
  );
};

export default ToolsMenu;
