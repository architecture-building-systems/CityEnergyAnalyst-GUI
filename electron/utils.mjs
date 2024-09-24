import dns from 'dns';

export async function checkInternet() {
  try {
    await dns.promises.lookup('google.com');
    return true; // Internet is connected
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      return false; // No internet connection
    }
    throw err;
  }
}
