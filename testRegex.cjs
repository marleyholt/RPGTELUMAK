const DICE_COMMAND_REGEX = /^(?:[!\/]r(?:oll)?\s+)?(?:(\d+)\s*#\s*)?([+-]?\s*\d+\s*)?\+?\s*(\d+)\s*d\s*(\d+)(?:\s*!\s*(\d+))?(?:\s*([+-]\s*\d+))?(?:\s+(.+))?$/i;
const tests = [
  "2#4+2d10!9",
  "10# 1d20",
  "2d10!9+4",
  "1d20!20",
  "-2+4d10!8"
];
tests.forEach(t => console.log(t, '=>', t.match(DICE_COMMAND_REGEX)));
