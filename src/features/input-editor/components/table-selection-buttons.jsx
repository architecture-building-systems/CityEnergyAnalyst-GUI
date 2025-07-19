import { useMemo, useState } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import { Button, Modal, Dropdown } from 'antd';
import EditSelectedModal from 'features/input-editor/components/InputEditor/EditSelectedModal';
import 'tabulator-tables/dist/css/tabulator.min.css';

import { INDEX_COLUMN } from 'features/input-editor/constants';
import { useDeleteBuildings } from 'features/input-editor/hooks/updates/useUpdateInputs';

export const TableButtons = ({
  selected,
  tabulator,
  tables,
  tab,
  columns,
  setSelected,
}) => {
  const deleteBuildings = useDeleteBuildings();

  const [filterToggle, setFilterToggle] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const currentTableIndexes = useMemo(
    () => Object.keys(tables?.[tab] || {}),
    [tables, tab],
  );
  const selectedInTable = useMemo(() => {
    return selected.length > 0 && currentTableIndexes.includes(selected[0]);
  }, [currentTableIndexes, selected]);

  const selectAll = () => {
    setSelected(tabulator.current.getData().map((data) => data[INDEX_COLUMN]));
  };

  const filterSelected = () => {
    if (filterToggle) {
      tabulator.current.clearFilter();
    } else {
      tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
    }
    tabulator.current.redraw();
    setFilterToggle((oldValue) => !oldValue);
  };

  const clearSelected = () => {
    setSelected([]);
  };

  const deleteSelected = () => {
    Modal.confirm({
      title: `Are you sure delete these ${tab == 'trees' ? 'trees ' : 'buildings'}?`,
      content: (
        <div>
          <i style={{ fontSize: '1vw' }}>
            This will delete the following{' '}
            {tab == 'trees' ? 'trees ' : 'buildings'} from every table:
          </i>
          <div style={{ overflow: 'auto', maxHeight: 200, margin: 10 }}>
            {selected.reduce((out, building) => `${out}, ${building}`)}
          </div>
        </div>
      ),
      centered: true,
      okText: 'DELETE',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        deleteBuildings([...selected]);
      },
    });
  };

  const editSelected = () => {
    setModalVisible(true);
  };

  const items = [
    {
      label: 'Select All',
      onClick: selectAll,
    },
    {
      label: 'Filter on Selection',
      onClick: filterSelected,
    },
    selectedInTable && {
      type: 'divider',
    },
    selectedInTable &&
      tab != 'schedules' && {
        label: 'Edit Selection',
        onClick: editSelected,
      },
    selectedInTable && {
      label: 'Clear Selection',
      onClick: clearSelected,
    },
    selectedInTable && {
      label: 'Delete Selection',
      onClick: deleteSelected,
      danger: true,
    },
  ];

  return (
    <>
      <Dropdown menu={{ items }} placement="bottomRight">
        <Button icon={<MenuOutlined />}></Button>
      </Dropdown>
      <EditSelectedModal
        visible={modalVisible}
        setVisible={setModalVisible}
        inputTable={tabulator.current}
        table={tab}
        columns={columns}
      />
    </>
  );
};
