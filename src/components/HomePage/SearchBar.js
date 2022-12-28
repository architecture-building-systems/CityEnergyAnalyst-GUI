import { useState, useEffect, useRef } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import axios from 'axios';
import './SearchBar.css';

const DOCS_URL = 'https://city-energy-analyst.readthedocs.io/en/latest/';

const useGlossaryData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getSearchResults = async () => {
      try {
        const result = await axios.get(`${process.env.CEA_URL}/api/glossary`);
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
    <div style={{ marginLeft: 50 }}>
      <Input
        placeholder="Glossary Search"
        suffix={<SearchOutlined />}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
          variable.VARIABLE.toLowerCase().indexOf(input.toLowerCase()) == 0
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
    shell.openExternal(
      `${DOCS_URL}${
        category === 'inputs' ? 'input' : 'output'
      }_methods.html?highlight=${VARIABLE}#${LOCATOR_METHOD.split('_').join(
        '-'
      )}`
    );
    setValue(VARIABLE);
  };

  return (
    <div className="cea-search-item" onClick={openUrl}>
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
