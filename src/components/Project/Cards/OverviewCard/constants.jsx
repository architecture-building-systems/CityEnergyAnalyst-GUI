import {
  BookOutlined,
  ExceptionOutlined,
  FlagOutlined,
  MailOutlined,
  RocketOutlined,
  YoutubeOutlined,
} from '@ant-design/icons';

import { isElectron, openExternal } from '../../../../utils/electron';

export const helpMenuUrls = {
  'learning-camp': 'https://www.cityenergyanalyst.com/learning-camp',
  'video-tutorials': 'https://www.cityenergyanalyst.com/video',
  documentation: 'http://city-energy-analyst.readthedocs.io/en/latest/',
  'report-issue':
    'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues/new?template=bug_report.yml',
  'known-issue':
    'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues?utf8=%E2%9C%93&q=is%3Aopen%26closed+label%3A%22known+issue%22+',
  contact: 'https://www.cityenergyanalyst.com/contact',
};

export const HelpMenuItemsLabel = ({ url, name }) => {
  const navigate = () => {
    if (isElectron()) openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return <div onClick={navigate}>{name}</div>;
};

export const helpMenuItems = [
  {
    label: 'Learning Camp',
    key: 'learning-camp',
    icon: <RocketOutlined />,
  },
  {
    label: 'Video Tutorials',
    key: 'video-tutorials',
    icon: <YoutubeOutlined />,
  },
  {
    label: 'Documentation',
    key: 'documentation',
    icon: <BookOutlined />,
  },
  {
    label: 'Report an Issue',
    key: 'report-issue',
    icon: <FlagOutlined />,
  },
  {
    label: 'Known Issues',
    key: 'known-issue',
    icon: <ExceptionOutlined />,
  },
  {
    label: 'Contact Us',
    key: 'contact',
    icon: <MailOutlined />,
  },
];
