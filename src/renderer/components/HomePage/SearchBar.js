import React, { useState, useEffect } from 'react';
import { shell } from 'electron';
import { Icon, Input } from 'antd';
import axios from 'axios';
import './SearchBar.css';

const DOCS_URL = 'https://city-energy-analyst.readthedocs.io/en/latest/';

const useGlossaryData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getSearchResults = async () => {
      try {
        const result = await axios.get('http://localhost:5050/api/glossary');
        setData(result.data);
      } catch (error) {
        console.log(error);
      }
    };
    getSearchResults();
  }, []);

  return data;
};

const SearchBar = () => {
  const data = useGlossaryData();
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);

  const handleChange = event => {
    setValue(event.target.value);
  };

  useEffect(() => {
    if (value.length > 0) setVisible(true);
    else setVisible(false);
  }, [value]);

  return (
    <div style={{ marginLeft: 50 }}>
      <Input
        placeholder="Glossary Search"
        suffix={<Icon type="search" />}
        onChange={handleChange}
      />
      <div className="cea-search-dropdown">
        {visible &&
          data.map(category => (
            <SearchCategory key={category.script} category={category}>
              {category.variables
                .filter(
                  variable =>
                    variable.VARIABLE.toLowerCase().indexOf(
                      value.toLowerCase()
                    ) !== -1
                )
                .map(variable => (
                  <SearchItem
                    key={`${category.script}-${variable.FILE_NAME}-${variable.VARIABLE}`}
                    category={category.script}
                    item={variable}
                  />
                ))}
            </SearchCategory>
          ))}
      </div>
    </div>
  );
};

const SearchCategory = ({ category, children }) => {
  return children.length ? (
    <div key={category.script} className="cea-search-category">
      <div className="cea-search-category-title">
        <b>
          <i>{category.script}</i>
        </b>
      </div>
      {children}
    </div>
  ) : null;
};

const SearchItem = ({ category, item }) => {
  const openUrl = () => {
    const type = category === 'input' ? 'input' : 'output';
    shell.openExternal(
      `${DOCS_URL}${type}_methods.html?highlight=${
        item.VARIABLE
      }#${item.LOCATOR_METHOD.split('_').join('-')}`
    );
  };

  return (
    <div className="cea-search-item" onClick={openUrl}>
      <div>
        <b>{item.VARIABLE}</b>
        <small> - {item.UNIT}</small>
      </div>
      <div className="cea-search-description">{item.DESCRIPTION}</div>
      <small style={{ wordBreak: 'break-all' }}>{item.FILE_NAME}</small>
    </div>
  );
};

export default SearchBar;
