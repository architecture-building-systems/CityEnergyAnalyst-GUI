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
    if (paths?.length) {
      form?.setFieldsValue({ [name]: paths[0] });
      return paths[0];
    }
  } catch (e) {
    console.error(e);
  }
};

export const openExternal = async (url) => {
  try {
    await window.api.openExternal(url);
  } catch (e) {
    console.error(e);
  }
};
