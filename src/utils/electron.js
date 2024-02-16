export const isElectron = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf(' electron/') !== -1;
};

export const openDialog = async (form, type, name) => {
  const options =
    type === 'PathParameter'
      ? { properties: ['openDirectory'] }
      : { properties: ['openFile'] };

  const paths = await window.api.send('open-dialog', options);
  if (paths && paths.length) {
    form.setFieldsValue({ [name]: paths[0] });
  }
};
