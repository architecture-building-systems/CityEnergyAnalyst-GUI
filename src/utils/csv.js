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

/**
 * Splits one CSV line into fields, honouring double-quoted fields that may contain commas
 * (RFC 4180 quoting, with `""` as an escaped quote). Header-only: does not handle a quoted
 * field that spans multiple lines.
 * @param {string} line
 * @returns {string[]}
 */
export const splitCsvLine = (line) => {
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
    } else if (char === ',') {
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
  return splitCsvLine(firstLine);
};
