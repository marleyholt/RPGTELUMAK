const trimmed = "r4+2*3";
const mathMatch = trimmed.match(/^[!\\/]?r\\s*([0-9\\+\\-\\*\\/\\s\\(\\)]+)$/i);
console.log(mathMatch);
const mathExp = mathMatch[1].trim();
console.log(new Function('return ' + mathExp)());
