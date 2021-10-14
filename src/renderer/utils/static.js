export default function getStatic(val) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  return isDevelopment ? `/static/${val}` : `../static/${val}`;
}
