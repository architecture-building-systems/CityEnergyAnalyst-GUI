/**
 * Client-side CSV header parsing.
 *
 * Lets a CsvColumnNameParameter field (see CsvColumnSelect in components/Parameter.jsx)
 * preview the header row of a CSV the user just selected for a sibling InputFileParameter --
 * before the file has been uploaded anywhere. In web mode, the value an upload field holds is
 * the raw browser File object (UploadInput's `beforeUpload` returns `false` specifically so
 * the automatic upload never fires and the File just sits in form state until job submission),
 * so the header can be read straight out of it: no server round-trip, nothing persisted. See
 * cea/analysis/lca/CLAUDE.md's "Grid Emission Intensity Override" section for the backend side
 * of this pairing.
 */

// A header row longer than this is not a well-formed CSV header; reading only this many bytes
// keeps a large data file from being read into memory just to preview its columns.
const HEADER_PREVIEW_BYTES = 64 * 1024;

// Mirrors the backend's `_CSV_DELIMITER_CANDIDATES`
// (cea/analysis/lca/emission_time_dependent.py) so the GUI's header preview and the server's
// actual parse agree on which delimiter a file uses.
const DELIMITER_CANDIDATES = [',', ';', '\t', '|'];

/**
 * Counts occurrences of `delimiter` in `line`, ignoring anything inside double-quoted fields
 * (RFC 4180) so a comma inside a quoted value doesn't inflate the comma count.
 * @param {string} line
 * @param {string} delimiter
 * @returns {number}
 */
const countDelimiterOutsideQuotes = (line, delimiter) => {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      count++;
    }
  }
  return count;
};

/**
 * Detects which of DELIMITER_CANDIDATES splits `line` into the most fields.
 *
 * Without this, a semicolon- or tab-delimited export (e.g. a European-locale spreadsheet,
 * where ';' replaces ',' as the field delimiter because ',' is used as the decimal separator)
 * reads as a single garbled column here -- with no comma to split on, the whole header line
 * becomes one "column" -- instead of surfacing its real headers.
 * @param {string} line
 * @returns {string} the detected delimiter, defaulting to ',' if none of the candidates
 * appear (e.g. a single-column file, where there's nothing to detect).
 */
export const sniffCsvDelimiter = (line) => {
  let best = ',';
  let bestCount = 0;
  for (const delimiter of DELIMITER_CANDIDATES) {
    const count = countDelimiterOutsideQuotes(line, delimiter);
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

/**
 * Splits one CSV line into fields, honouring double-quoted fields that may contain the
 * delimiter (RFC 4180 quoting, with `""` as an escaped quote). Header-only: does not handle a
 * quoted field that spans multiple lines.
 * @param {string} line
 * @param {string} [delimiter] defaults to ','
 * @returns {string[]}
 */
export const splitCsvLine = (line, delimiter = ',') => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
};

/**
 * Reads the header row of a CSV file selected in the browser and returns its column names.
 * Reads at most HEADER_PREVIEW_BYTES bytes, so it stays cheap even for a large upload.
 * @param {File} file
 * @returns {Promise<string[]>} column names, or [] for an empty file
 */
export const readCsvHeaderColumns = async (file) => {
  const chunk = file.slice(0, HEADER_PREVIEW_BYTES);
  const text = await chunk.text();
  const firstLine = text.split(/\r\n|\n/, 1)[0] ?? '';
  if (firstLine.trim() === '') return [];
  return splitCsvLine(firstLine, sniffCsvDelimiter(firstLine));
};
