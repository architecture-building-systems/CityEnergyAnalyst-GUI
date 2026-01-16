export const isElectron = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf(' electron/') !== -1;
};

export const openDialog = async (form, type, filters, name) => {
  const options =
    type === 'directory'
      ? { properties: ['openDirectory'] }
      : { properties: ['openFile'], filters };

  try {
    const paths = await window.api.openDialog(options);
    const path = paths?.length ? paths[0] : null;
    form?.setFieldsValue({ [name]: path });
    return path;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const openExternal = async (url) => {
  try {
    await window.api.openExternal(url);
  } catch (e) {
    console.error(e);
  }
};
