const parseFortitude = (val) => {
  if (!val) return 0;
  const str = String(val);
  
  // if there's a pipe, try to get the number after the pipe
  const parts = str.split('|');
  const targetStr = parts.length > 1 ? parts[1] : parts[0];
  
  // extract the first number in the target string
  const match = targetStr.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  
  // fallback to any number in the whole string
  const fallback = str.match(/\d+/);
  return fallback ? parseInt(fallback[0], 10) : 0;
}

console.log(parseFortitude("29+4 | 33 equipados")); // 33
console.log(parseFortitude("15")); // 15
console.log(parseFortitude("29")); // 29
console.log(parseFortitude("33 equipados")); // 33
