import {
  BookOutlined,
  FlagOutlined,
  MailOutlined,
  RocketOutlined,
  StarTwoTone,
  YoutubeOutlined,
} from '@ant-design/icons';

export const helpMenuUrls = {
  'learning-camp': 'https://www.cityenergyanalyst.com/learning-camp',
  'video-tutorials': 'https://www.cityenergyanalyst.com/video',
  documentation: 'http://city-energy-analyst.readthedocs.io/en/latest/',
  'report-issue':
    'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues/new?template=bug_report.yml',
  contact: 'https://www.cityenergyanalyst.com/contact',
  'github-repo':
    'https://github.com/architecture-building-systems/CityEnergyAnalyst',
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
    label: 'Contact Us',
    key: 'contact',
    icon: <MailOutlined />,
  },
  {
    type: 'divider',
  },
  {
    label: 'Star us on GitHub!',
    key: 'github-repo',
    icon: <StarTwoTone twoToneColor="#bb0" />,
  },
];
