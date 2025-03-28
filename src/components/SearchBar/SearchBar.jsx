import { useState, useEffect, useRef } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import './SearchBar.css';
import { apiClient } from '../../api/axios';

const DOCS_URL = 'https://city-energy-analyst.readthedocs.io/en/latest/';

const useGlossaryData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getSearchResults = async () => {
      try {
        const result = await apiClient.get(`/api/glossary/`);
        setData(result.data);
      } catch (error) {
        console.error(error);
      }
    };
    getSearchResults();
  }, []);

  return data;
};

const SearchBar = () => {
  const data = useGlossaryData();
  const [value, setValue] = useState('');
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef();

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const handleFocus = () => {
    setVisible(true);
  };

  const handleBlur = () => {
    setTimeout(() => setVisible(false), 300);
  };

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    if (!value.trim()) setInput('');
    timeoutRef.current = setTimeout(() => {
      setInput(value);
    }, 500);
  }, [value]);

  return (
    <div style={{ margin: '0 24px' }}>
      <Input
        placeholder="Glossary Search"
        suffix={<SearchOutlined />}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ width: 280 }}
      />
      {visible && input.length ? (
        <SearchResults
          data={data}
          input={input}
          visible={visible}
          setValue={setValue}
        />
      ) : null}
    </div>
  );
};

const SearchResults = ({ data, input, setValue }) => {
  const results = data
    .map((category) => {
      const variables = category.variables.filter(
        (variable) =>
          variable.VARIABLE.length != 0 &&
          variable.VARIABLE.toLowerCase().indexOf(input.toLowerCase()) == 0,
      );
      if (!variables.length) return null;
      return (
        <div key={category.script} className="cea-search-category">
          <div className="cea-search-category-title">{category.script}</div>
          {variables.map((variable) => (
            <SearchItem
              key={`${category.script}-${variable.FILE_NAME}-${variable.VARIABLE}`}
              category={category.script}
              item={variable}
              setValue={setValue}
            />
          ))}
        </div>
      );
    })
    .filter((category) => !!category);

  return (
    <div className="cea-search-dropdown">
      {results.length ? (
        results
      ) : (
        <div className="cea-search-item empty">
          No results found for
          <b>
            <i>{` ${input}`}</i>
          </b>
        </div>
      )}
    </div>
  );
};

const SearchItem = ({ category, item, setValue }) => {
  const { VARIABLE, UNIT, DESCRIPTION, FILE_NAME, LOCATOR_METHOD } = item;
  const openUrl = () => {
    window.open(
      `${DOCS_URL}${
        category === 'inputs' ? 'input' : 'output'
      }_methods.html?highlight=${VARIABLE}#${LOCATOR_METHOD.split('_').join(
        '-',
      )}`,
      '_blank',
      'noreferrer',
    );
    setValue(VARIABLE);
  };

  return (
    <div
      className="cea-search-item"
      tabIndex="0"
      role="button"
      onClick={openUrl}
      onKeyDown={() => {}}
    >
      <div>
        <b>{VARIABLE}</b>
        <small> - {UNIT}</small>
      </div>
      <div className="cea-search-description">{DESCRIPTION}</div>
      <small style={{ wordBreak: 'break-all' }}>{FILE_NAME}</small>
    </div>
  );
};

export default SearchBar;
