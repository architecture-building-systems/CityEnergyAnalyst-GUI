import { FileOutlined, FolderFilled, FolderTwoTone } from '@ant-design/icons';
import { Breadcrumb, Button, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { getContentInfo } from 'utils/file';

const DialogModel = ({ open, setOpen, onSuccess = () => {} }) => {
  const [content, setContent] = useState({
    name: null,
    path: null,
    contents: [],
  });

  const updateContent = async (contentPath = '', root_path = null) => {
    const contentInfo = await getContentInfo(
      contentPath,
      'directory',
      root_path,
    );
    setContent(contentInfo);
  };

  const refreshContent = async () => {
    await updateContent(content.path);
  };

  const handleOk = () => {
    onSuccess(content.path);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  useEffect(() => {
    updateContent();
  }, []);

  return (
    <Modal
      title=""
      open={open}
      width={'80%'}
      onOk={handleOk}
      onCancel={handleCancel}
      mask={false}
    >
      <Button onClick={refreshContent}>Refresh</Button>
      <ContentTable content={content} updateContent={updateContent} />
    </Modal>
  );
};

const ContentTable = ({ content, updateContent }) => {
  const { path, contents } = content;

  return (
    <div style={{ margin: 12, border: '1px solid LightGrey', borderRadius: 6 }}>
      <div style={{ background: 'Gainsboro' }}>
        <ContentBreadcrumb path={path} updateContent={updateContent} />
      </div>

      <div
        style={{
          overflowY: 'auto',
          maxHeight: 500,
        }}
      >
        {contents.length ? (
          contents
            .sort((current, next) => current.type.localeCompare(next.type))
            .map((info, index) => (
              <ContentRow
                key={index}
                content={info}
                updateContent={updateContent}
              />
            ))
        ) : (
          <div>Nothing Found</div>
        )}
      </div>
    </div>
  );
};

const ContentBreadcrumb = ({ path, updateContent }) => {
  const splitPaths = () => {};
  const paths = splitPaths(path);

  const crumbs = paths.map((path, index) => (
    <Breadcrumb.Item key={index}>{path}</Breadcrumb.Item>
  ));

  return (
    <div style={{ padding: 12 }}>
      <Breadcrumb>
        <Breadcrumb.Item>
          <FolderTwoTone
            style={{ fontSize: 18 }}
            onClick={() => {
              updateContent();
            }}
          />
        </Breadcrumb.Item>
        {crumbs}
      </Breadcrumb>
    </div>
  );
};

const ContentRow = ({ content, updateContent }) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleClick = () => {
    if (type == 'directory') updateContent(path);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleClick();
  };

  const { name, path, type } = content;
  const contentIcon =
    type == 'directory' ? (
      <FolderFilled
        style={{ fontSize: 16, margin: '0px 6px', color: 'grey' }}
      />
    ) : (
      <FileOutlined style={{ fontSize: 16, margin: '0px 6px' }} />
    );

  return (
    <div
      style={{
        borderBottom: '1px solid Gainsboro',
        padding: 8,
        fontSize: 13,
        background: isHovering ? 'WhiteSmoke' : '',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {contentIcon}
      <span
        style={{
          cursor: isHovering ? 'pointer' : '',
          color: '#1890ff',
        }}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKey}
      >
        {name}
      </span>
    </div>
  );
};

export default DialogModel;
